import { readFile } from 'fs/promises'
import { parse } from 'csv-parse/sync'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.DOTENV_PATH || '.env' })

const { generateEmbedding } = await import('../src/services/embedding.js')
const { default: Anime } = await import('../src/models/anime.js')

const csvPath = new URL('../src/data/anime_dataset.csv', import.meta.url)
const BATCH_SIZE = 25

function splitField(value) {
    return value
        ? value
              .split('|')
              .map((v) => v.trim())
              .filter(Boolean)
        : []
}

function formatContent(row) {
    const parts = [
        row.title,
        row.title_english !== row.title ? row.title_english : null,
        row.title_japanese,
        row.type,
        splitField(row.genres).join(', '),
        splitField(row.themes).join(', '),
        row.demographics,
        row.studios,
        row.rating,
        row.synopsis,
    ]

    return parts.filter(Boolean).join('. ')
}

function dedupeByMalId(rows) {
    const map = new Map()
    for (const row of rows) map.set(row.mal_id, row)
    return Array.from(map.values())
}

function parseDurationMinutes(value) {
    if (!value || /unknown/i.test(value)) return null

    const hrMatch = value.match(/(\d+)\s*hr/)
    const minMatch = value.match(/(\d+)\s*min/)
    const total = (hrMatch ? Number(hrMatch[1]) * 60 : 0) + (minMatch ? Number(minMatch[1]) : 0)

    return total || null
}

function parseNumber(value) {
    return value && !isNaN(Number(value)) ? Number(value) : null
}

function parseBoolean(value) {
    return String(value).trim().toLowerCase() === 'true'
}

async function ingest() {
    const raw = await readFile(csvPath, 'utf-8')
    const rows = parse(raw, { columns: true, skip_empty_lines: true })
    const deduped = dedupeByMalId(rows).filter((row) => row.mal_id)

    console.log(`Parsed ${rows.length} rows, ${deduped.length} unique after dedupe.`)

    const anime = new Anime()

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
        const batch = deduped.slice(i, i + BATCH_SIZE)

        const records = []
        for (const row of batch) {
            const content = formatContent(row)
            const embedding = await generateEmbedding(content)

            records.push({
                mal_id: Number(row.mal_id),
                title: row.title,
                title_english:
                    row.title_english && row.title_english !== row.title ? row.title_english : null,
                title_japanese: row.title_japanese || null,
                type: row.type || null,
                year: row.year ? Number(row.year) : null,
                genres: splitField(row.genres),
                synopsis: row.synopsis || null,
                rating: row.rating || null,
                score: parseNumber(row.score),
                popularity: parseNumber(row.popularity),
                status: row.status || null,
                is_airing: parseBoolean(row.airing),
                image_url: row.image_url || null,
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
