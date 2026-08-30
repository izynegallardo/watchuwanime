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

async function insertAnime({ malId, title, embedding, durationMinutes = 24, episodes = 12 }) {
    const result = await pool.query(
        `insert into anime (mal_id, title, content, embedding, duration_minutes, episodes)
         values ($1, $2, $3, $4::vector, $5, $6)
         returning id`,
        [malId, title, `${title} content`, toVector(embedding), durationMinutes, episodes],
    )

    return result.rows[0].id
}

describe('anime schema + match_anime() (integration, local Postgres)', () => {
    beforeAll(async () => {
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
        await pool.query('TRUNCATE anime RESTART IDENTITY')
    })

    afterAll(async () => {
        await pool.query('DROP TABLE IF EXISTS anime CASCADE')
        await pool.end()
    })

    it('computes total_minutes automatically from duration and episode count', async () => {
        await insertAnime({
            malId: 1,
            title: 'Duration Check',
            embedding: unitVector(0),
            durationMinutes: 24,
            episodes: 12,
        })

        const { rows } = await pool.query('select total_minutes from anime where mal_id = 1')

        expect(rows[0].total_minutes).toBe(288)
    })

    it('upserts by mal_id instead of creating duplicate rows', async () => {
        await insertAnime({ malId: 2, title: 'Original Title', embedding: unitVector(1) })

        await pool.query(
            `insert into anime (mal_id, title, content, embedding)
             values ($1, $2, $3, $4::vector)
             on conflict (mal_id) do update set title = excluded.title`,
            [2, 'Updated Title', 'Updated Title content', toVector(unitVector(1))],
        )

        const { rows } = await pool.query('select title from anime where mal_id = 2')

        expect(rows).toHaveLength(1)
        expect(rows[0].title).toBe('Updated Title')
    })

    it('ranks the closest embedding highest and filters out anything below the threshold', async () => {
        await insertAnime({ malId: 3, title: 'Exact Match', embedding: unitVector(0) })
        await insertAnime({ malId: 4, title: 'Close Match', embedding: nearAxisZero() })
        await insertAnime({ malId: 5, title: 'Unrelated', embedding: unitVector(2) })

        const { rows } = await pool.query('select * from match_anime($1::vector, $2, $3, $4)', [
            toVector(unitVector(0)),
            0.5,
            10,
            [],
        ])

        const titles = rows.map((r) => r.title)

        expect(titles).toEqual(['Exact Match', 'Close Match'])
        expect(titles).not.toContain('Unrelated')
        expect(rows[0].similarity).toBeCloseTo(1, 5)
    })

    it('excludes ids passed via exclude_ids even when they are the best match', async () => {
        const bestMatchId = await insertAnime({
            malId: 6,
            title: 'Best Match',
            embedding: unitVector(3),
        })

        const { rows } = await pool.query('select * from match_anime($1::vector, $2, $3, $4)', [
            toVector(unitVector(3)),
            0.5,
            10,
            [bestMatchId],
        ])

        expect(rows.map((r) => r.title)).not.toContain('Best Match')
    })
})
