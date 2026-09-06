import { readFile } from 'fs/promises'
import { pool } from '../../core/database'

/**
 * This suite talks to Postgres directly via `pg`, not through models/anime.js.
 * The model goes through @supabase/supabase-js, which expects Supabase's
 * PostgREST layer in front of the database -- that doesn't exist on a bare
 * local Postgres install. What we CAN verify locally, and what no mock or
 * unit test can cover, is the raw SQL contract both the model and the real
 * Supabase project depend on: the vector extension, the generated
 * total_minutes column, and the match_anime() scoring/threshold/exclusion
 * logic itself.
 */

function toVector(values) {
    return `[${values.join(',')}]`
}

function unitVector(index) {
    const values = new Array(384).fill(0)
    values[index] = 1
    return values
}

// Close to, but not identical to, axis 0 -- normalized to length 1 so it
// behaves like a real (normalized) embedding for cosine similarity.
function nearAxisZero() {
    const values = new Array(384).fill(0)
    values[0] = 0.9
    values[1] = Math.sqrt(1 - 0.9 ** 2)
    return values
}

async function insertAnime({
    paheId,
    title,
    embedding,
    durationMinutes = 24,
    episodes = 12,
    genres = [],
    airedFrom = null,
}) {
    const result = await pool.query(
        `insert into anime (pahe_id, title, content, embedding, duration_minutes, episodes, genres, aired_from)
         values ($1, $2, $3, $4::vector, $5, $6, $7, $8)
         returning id`,
        [
            paheId,
            title,
            `${title} content`,
            toVector(embedding),
            durationMinutes,
            episodes,
            genres,
            airedFrom,
        ],
    )

    return result.rows[0].id
}

// Whether we're pointed at a real, persistent database (test Supabase) rather
// than disposable local Postgres. Signal: DATABASE_URL is only ever set for
// Supabase targets (see core/database.js). Against a real database we must
// never touch the schema or existing rows - only insert/clean up our own
// sentinel fixtures.
const isRemote = Boolean(process.env.DATABASE_URL)

// pahe_id is free-form text (UUID-shaped in the real dataset) - unlike
// mal_id there's no numeric range to reserve for fixtures, so a distinctive
// prefix is what keeps this suite safe to run against the persistent test
// Supabase database instead.
const SENTINEL_TITLES = [
    'Duration Check',
    'Year Check',
    'Original Title',
    'Updated Title',
    'Exact Match',
    'Close Match',
    'Unrelated',
    'Best Match',
    'Safe Genre',
    'Mature Genre',
]

function sentinelPaheId(suffix) {
    return `test-sentinel-${suffix}`
}

async function cleanupSentinelRows() {
    await pool.query("DELETE FROM anime WHERE pahe_id LIKE 'test-sentinel-%'")
}

describe('anime schema + match_anime()', () => {
    beforeAll(async () => {
        if (isRemote) return // schema already exists in Supabase, applied via migrate:*

        const [table, matchFn] = await Promise.all([
            readFile(
                new URL('../../../migrations/001_create_anime_table.sql', import.meta.url),
                'utf-8',
            ),
            readFile(
                new URL('../../../migrations/002_create_match_anime_fn.sql', import.meta.url),
                'utf-8',
            ),
        ])

        await pool.query('DROP TABLE IF EXISTS anime CASCADE')
        await pool.query(table)
        await pool.query(matchFn)
    })

    beforeEach(async () => {
        // Isolate each test's rows so similarity assertions can't be thrown
        // off by embeddings inserted in a previous test.
        if (isRemote) {
            await cleanupSentinelRows()
        } else {
            await pool.query('TRUNCATE anime RESTART IDENTITY')
        }
    })

    afterAll(async () => {
        if (isRemote) {
            await cleanupSentinelRows()
        } else {
            await pool.query('DROP TABLE IF EXISTS anime CASCADE')
        }

        await pool.end()
    })

    it('computes total_minutes automatically from duration and episode count', async () => {
        await insertAnime({
            paheId: sentinelPaheId('1'),
            title: 'Duration Check',
            embedding: unitVector(0),
            durationMinutes: 24,
            episodes: 12,
        })

        const { rows } = await pool.query('select total_minutes from anime where pahe_id = $1', [
            sentinelPaheId('1'),
        ])

        expect(rows[0].total_minutes).toBe(288)
    })

    it('derives year automatically from aired_from', async () => {
        await insertAnime({
            paheId: sentinelPaheId('7'),
            title: 'Year Check',
            embedding: unitVector(4),
            airedFrom: '2023-10-03',
        })

        const { rows } = await pool.query('select year from anime where pahe_id = $1', [
            sentinelPaheId('7'),
        ])

        expect(rows[0].year).toBe(2023)
    })

    it('upserts by pahe_id instead of creating duplicate rows', async () => {
        await insertAnime({
            paheId: sentinelPaheId('2'),
            title: 'Original Title',
            embedding: unitVector(1),
        })

        await pool.query(
            `insert into anime (pahe_id, title, content, embedding)
             values ($1, $2, $3, $4::vector)
             on conflict (pahe_id) do update set title = excluded.title`,
            [
                sentinelPaheId('2'),
                'Updated Title',
                'Updated Title content',
                toVector(unitVector(1)),
            ],
        )

        const { rows } = await pool.query('select title from anime where pahe_id = $1', [
            sentinelPaheId('2'),
        ])

        expect(rows).toHaveLength(1)
        expect(rows[0].title).toBe('Updated Title')
    })

    it('ranks the closest embedding highest and filters out anything below the threshold', async () => {
        await insertAnime({
            paheId: sentinelPaheId('3'),
            title: 'Exact Match',
            embedding: unitVector(0),
        })
        await insertAnime({
            paheId: sentinelPaheId('4'),
            title: 'Close Match',
            embedding: nearAxisZero(),
        })
        await insertAnime({
            paheId: sentinelPaheId('5'),
            title: 'Unrelated',
            embedding: unitVector(2),
        })

        // Wider match_count when remote: real rows sharing the table could
        // otherwise push a sentinel fixture out of a tight top-N window.
        const { rows } = await pool.query('select * from match_anime($1::vector, $2, $3, $4, $5)', [
            toVector(unitVector(0)),
            0.5,
            isRemote ? 50 : 10,
            [],
            [],
        ])

        // Ignore any real anime rows that happen to also cross the threshold
        // when running against the populated test Supabase table.
        const titles = rows.map((r) => r.title).filter((title) => SENTINEL_TITLES.includes(title))

        expect(titles).toEqual(['Exact Match', 'Close Match'])
        expect(titles).not.toContain('Unrelated')
        expect(rows[0].similarity).toBeCloseTo(1, 5)
    })

    it('excludes ids passed via exclude_ids even when they are the best match', async () => {
        const bestMatchId = await insertAnime({
            paheId: sentinelPaheId('6'),
            title: 'Best Match',
            embedding: unitVector(3),
        })

        const { rows } = await pool.query('select * from match_anime($1::vector, $2, $3, $4, $5)', [
            toVector(unitVector(3)),
            0.5,
            isRemote ? 50 : 10,
            [bestMatchId],
            [],
        ])

        expect(rows.map((r) => r.title)).not.toContain('Best Match')
    })

    it('excludes genres passed via exclude_genres even when they are the best match', async () => {
        await insertAnime({
            paheId: sentinelPaheId('8'),
            title: 'Safe Genre',
            embedding: unitVector(8),
            genres: ['Action'],
        })
        await insertAnime({
            paheId: sentinelPaheId('9'),
            title: 'Mature Genre',
            embedding: unitVector(8),
            genres: ['Ecchi'],
        })

        const { rows } = await pool.query('select * from match_anime($1::vector, $2, $3, $4, $5)', [
            toVector(unitVector(8)),
            0.5,
            isRemote ? 50 : 10,
            [],
            ['Ecchi'],
        ])

        const titles = rows.map((r) => r.title).filter((title) => SENTINEL_TITLES.includes(title))

        expect(titles).toContain('Safe Genre')
        expect(titles).not.toContain('Mature Genre')
    })
})
