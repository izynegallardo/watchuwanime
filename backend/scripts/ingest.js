import { readFile } from 'fs/promises'
import { parse } from 'csv-parse/sync'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.DOTENV_PATH || '.env' })

const { generateEmbedding } = await import('../src/services/embedding.js')
const { default: Anime } = await import('../src/models/anime.js')

const csvPath = new URL('../src/data/20260904.csv', import.meta.url)
const BATCH_SIZE = 25

function splitCommaList(value) {
    return value
        ? value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
        : []
}

// genres/themes/demographics/studios now arrive as JSON-array strings
// (e.g. '["Action", "Drama"]'), relations/recommendations/external_links as
// JSON arrays of objects. Malformed or empty cells fall back to [].
function parseJsonArray(value) {
    if (!value) return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// relations/recommendations are intentionally excluded here - baking them
// into the embedded text would let the dataset's own "related anime" bias
// leak into vector similarity, which defeats the point of doing RAG at all.
// They're kept only as structured fallback data, applied post-search.
function formatContent(row) {
    const genres = parseJsonArray(row.genres)
    const themes = parseJsonArray(row.themes)
    const demographics = parseJsonArray(row.demographics)
    const studios = parseJsonArray(row.studios)

    const parts = [
        row.title,
        row.title_romaji && row.title_romaji !== row.title ? row.title_romaji : null,
        row.title_japanese,
        row.type,
        genres.join(', '),
        themes.join(', '),
        demographics.join(', '),
        studios.join(', '),
        row.summary,
    ]

    return parts.filter(Boolean).join('. ')
}

function dedupeByPaheId(rows) {
    const map = new Map()
    for (const row of rows) map.set(row.pahe_id, row)
    return Array.from(map.values())
}

// Dataset now only ever reports a single-episode length as "NN minutes" -
// no more "1 hr 30 min" movies to combine, so this is a plain match.
function parseDurationMinutes(value) {
    if (!value) return null
    const match = value.match(/(\d+)\s*minutes?/i)
    return match ? Number(match[1]) : null
}

function parseNumber(value) {
    return value && !isNaN(Number(value)) ? Number(value) : null
}

function parseBoolean(value) {
    return String(value).trim().toLowerCase() === 'true'
}

// "Mar 09, 2019" -> "2019-03-09". aired_to is often blank for ongoing/movie
// entries, Date correctly rejects that and we return null.
function parseDate(value) {
    if (!value) return null
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

async function ingest() {
    const raw = await readFile(csvPath, 'utf-8')
    const rows = parse(raw, { columns: true, skip_empty_lines: true })
    const deduped = dedupeByPaheId(rows).filter((row) => row.pahe_id)

    console.log(`Parsed ${rows.length} rows, ${deduped.length} unique after dedupe.`)

    const anime = new Anime()

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
        const batch = deduped.slice(i, i + BATCH_SIZE)

        const records = []
        for (const row of batch) {
            const content = formatContent(row)
            const embedding = await generateEmbedding(content)

            records.push({
                pahe_id: row.pahe_id,
                title: row.title,
                title_romaji:
                    row.title_romaji && row.title_romaji !== row.title ? row.title_romaji : null,
                title_japanese: row.title_japanese || null,
                title_spanish: row.title_spanish || null,
                title_french: row.title_french || null,
                synonyms: splitCommaList(row.synonyms),
                type: row.type || null,
                aired_from: parseDate(row.aired_from),
                aired_to: parseDate(row.aired_to),
                season: row.season || null,
                genres: parseJsonArray(row.genres),
                themes: parseJsonArray(row.themes),
                demographics: parseJsonArray(row.demographics),
                studios: parseJsonArray(row.studios),
                summary: row.summary || null,
                status: row.status || null,
                is_airing: parseBoolean(row.airing),
                image_url: row.image_url || null,
                youtube_url: row.youtube_url || null,
                external_links: parseJsonArray(row.external_links),
                relations: parseJsonArray(row.relations),
                recommendations: parseJsonArray(row.recommendations),
                duration_minutes: parseDurationMinutes(row.duration),
                episodes: parseNumber(row.episodes),
                content,
                embedding,
            })
        }

        if (records.length) await anime.create(records)
        console.log(`Ingested ${Math.min(i + BATCH_SIZE, deduped.length)} / ${deduped.length}`)
    }

    console.log('Ingestion complete.')
}

ingest().catch((error) => {
    console.error('Ingestion failed:', error)
    process.exit(1)
})
