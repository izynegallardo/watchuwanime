import { pool } from '../../core/database.js'
import Anime from '../anime.js'

/**
 * Unlike anime.integration.test.js (which talks to Postgres directly via `pg`
 * to verify the raw SQL contract), this suite goes through the real Anime
 * model -> supabase-js -> PostgREST, the exact path ingestion and the live
 * app use. It only makes sense against a real Supabase project - PostgREST
 * doesn't exist on bare local Postgres - so it's skipped there rather than
 * failing.
 */
const isRemote = Boolean(process.env.DATABASE_URL)
const describeIfRemote = isRemote ? describe : describe.skip

function unitVector(index) {
    const values = new Array(384).fill(0)
    values[index] = 1
    return values
}

// pahe_id is free-form text (UUID-shaped in the real dataset), unlike mal_id
// there's no numeric range to reserve for fixtures. A distinctive prefix
// serves the same purpose: trivially identifiable, never collides with a
// genuinely ingested pahe_id.
function sentinelPaheId(suffix) {
    return `test-sentinel-${suffix}`
}

async function cleanupSentinelRows() {
    await pool.query("DELETE FROM anime WHERE pahe_id LIKE 'test-sentinel-%'")
}

describeIfRemote('Anime model (integration, via supabase-js)', () => {
    afterEach(cleanupSentinelRows)
    afterAll(() => pool.end())

    it('create() upserts by pahe_id through supabase-js', async () => {
        const anime = new Anime()
        const paheId = sentinelPaheId('101')

        await anime.create([
            {
                pahe_id: paheId,
                title: 'Model Test Original',
                content: 'content',
                embedding: unitVector(0),
            },
        ])

        const updated = await anime.create([
            {
                pahe_id: paheId,
                title: 'Model Test Updated',
                content: 'content',
                embedding: unitVector(0),
            },
        ])

        expect(updated[0].title).toBe('Model Test Updated')

        const { rows } = await pool.query('select title from anime where pahe_id = $1', [paheId])
        expect(rows).toHaveLength(1)
    })

    it('search() finds the closest match and respects excludeIds', async () => {
        const anime = new Anime()

        const [{ id }] = await anime.create([
            {
                pahe_id: sentinelPaheId('102'),
                title: 'Model Search Match',
                content: 'content',
                embedding: unitVector(6),
            },
        ])

        const found = await anime.search(unitVector(6), { matchThreshold: 0.5, matchCount: 50 })
        expect(found.map((r) => r.title)).toContain('Model Search Match')

        const excluded = await anime.search(unitVector(6), {
            matchThreshold: 0.5,
            matchCount: 50,
            excludeIds: [id],
        })
        expect(excluded.map((r) => r.title)).not.toContain('Model Search Match')
    })

    it('findByPaheIds() looks up rows directly by pahe_id, used for the relations/recommendations backfill', async () => {
        const anime = new Anime()
        const paheId = sentinelPaheId('103')

        await anime.create([
            {
                pahe_id: paheId,
                title: 'Model FindByPaheIds',
                content: 'content',
                embedding: unitVector(7),
            },
        ])

        const found = await anime.findByPaheIds([paheId, sentinelPaheId('does-not-exist')])
        expect(found.map((r) => r.title)).toEqual(['Model FindByPaheIds'])
    })
})
