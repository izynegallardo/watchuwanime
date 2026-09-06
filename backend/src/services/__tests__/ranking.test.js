import { rankByFit, dedupeByRelations, excludeSelfReferencedTitles } from '../ranking.js'

function buildCandidate(overrides = {}) {
    return {
        id: 1,
        pahe_id: 'pahe-1',
        title: 'Test Anime',
        similarity: 0.5,
        duration_minutes: null,
        total_minutes: null,
        status: null,
        relations: [],
        ...overrides,
    }
}

describe('rankByFit', () => {
    it('falls back to plain similarity order when no factors are enabled', () => {
        const candidates = [
            buildCandidate({ id: 1, similarity: 0.4 }),
            buildCandidate({ id: 2, similarity: 0.9 }),
            buildCandidate({ id: 3, similarity: 0.6 }),
        ]

        const ranked = rankByFit(candidates, {}, [])

        expect(ranked.map((c) => c.id)).toEqual([2, 3, 1])
    })

    it('boosts a candidate whose single-episode duration is a closer fit to the available time', () => {
        const candidates = [
            buildCandidate({ id: 'too-long', similarity: 0.6, duration_minutes: 90 }),
            buildCandidate({ id: 'good-fit', similarity: 0.6, duration_minutes: 24 }),
        ]

        const ranked = rankByFit(candidates, { timeAvailable: 24 }, ['duration'])

        expect(ranked[0].id).toBe('good-fit')
    })

    it('treats unknown duration as neutral rather than penalizing it', () => {
        const candidates = [
            buildCandidate({ id: 'unknown', similarity: 0.6, duration_minutes: null }),
            buildCandidate({ id: 'bad-fit', similarity: 0.6, duration_minutes: 180 }),
        ]

        const ranked = rankByFit(candidates, { timeAvailable: 24 }, ['duration'])

        expect(ranked[0].id).toBe('unknown')
    })

    it('judges duration per-episode, not by total series runtime', () => {
        // Regression check: at or below SHORT_SESSION_MINUTES (25), a
        // 12-episode series at 24 min/ep should fit a 24-minute slot exactly
        // as well as a single 24-minute movie, since duration is judged
        // per-episode in that range regardless of total_minutes.
        const series = buildCandidate({
            id: 'series',
            similarity: 0.6,
            duration_minutes: 24,
            total_minutes: 288,
        })
        const movie = buildCandidate({
            id: 'movie',
            similarity: 0.6,
            duration_minutes: 24,
            total_minutes: 24,
        })

        const ranked = rankByFit([series, movie], { timeAvailable: 24 }, ['duration'])

        expect(ranked[0].fitScore).toBeCloseTo(ranked[1].fitScore, 10)
    })

    it('prioritizes total series runtime once timeAvailable is above the short-session threshold', () => {
        const longSeries = buildCandidate({
            id: 'long-series',
            similarity: 0.6,
            duration_minutes: 24,
            total_minutes: 480,
        })
        const goodFit = buildCandidate({
            id: 'good-fit',
            similarity: 0.6,
            duration_minutes: 24,
            total_minutes: 120,
        })

        const ranked = rankByFit([longSeries, goodFit], { timeAvailable: 120 }, ['duration'])

        expect(ranked[0].id).toBe('good-fit')
    })

    it('falls back to per-episode duration_minutes at or below the short-session threshold', () => {
        // Both fit poorly, but duration_minutes (per-episode) is what's
        // judged here since timeAvailable (25) is at the threshold - the
        // short-episode series wins even though its own total runtime (480)
        // dwarfs the movie's.
        const shortEpisodeLongTotal = buildCandidate({
            id: 'short-episode-long-total',
            similarity: 0.6,
            duration_minutes: 24,
            total_minutes: 480,
        })
        const movie = buildCandidate({
            id: 'movie',
            similarity: 0.6,
            duration_minutes: 90,
            total_minutes: 90,
        })

        const ranked = rankByFit([shortEpisodeLongTotal, movie], { timeAvailable: 25 }, ['duration'])

        expect(ranked[0].id).toBe('short-episode-long-total')
    })

    it('ranks finished series above currently airing, and both above unknown status', () => {
        const candidates = [
            buildCandidate({ id: 'unknown', similarity: 0.6, status: null }),
            buildCandidate({ id: 'airing', similarity: 0.6, status: 'Currently Airing' }),
            buildCandidate({ id: 'finished', similarity: 0.6, status: 'Finished Airing' }),
        ]

        const ranked = rankByFit(candidates, {}, ['status'])

        expect(ranked.map((c) => c.id)).toEqual(['finished', 'airing', 'unknown'])
    })

    it('lets a strong combined fit outrank a slightly higher raw similarity', () => {
        const candidates = [
            buildCandidate({
                id: 'high-similarity-poor-fit',
                similarity: 0.65,
                duration_minutes: 180,
                status: 'Discontinued',
            }),
            buildCandidate({
                id: 'lower-similarity-great-fit',
                similarity: 0.6,
                duration_minutes: 24,
                status: 'Finished Airing',
            }),
        ]

        const ranked = rankByFit(candidates, { timeAvailable: 24 }, ['duration', 'status'])

        expect(ranked[0].id).toBe('lower-similarity-great-fit')
    })

    it('ignores factor keys that do not exist in RANK_FACTORS', () => {
        const candidates = [
            buildCandidate({ id: 1, similarity: 0.4 }),
            buildCandidate({ id: 2, similarity: 0.9 }),
        ]

        const ranked = rankByFit(candidates, {}, ['not-a-real-factor'])

        expect(ranked.map((c) => c.id)).toEqual([2, 1])
    })

    it('does not mutate the input array', () => {
        const candidates = [buildCandidate({ id: 1, similarity: 0.3 })]
        const snapshot = JSON.parse(JSON.stringify(candidates))

        rankByFit(candidates, {}, ['status'])

        expect(candidates).toEqual(snapshot)
    })
})

describe('dedupeByRelations', () => {
    it('keeps the highest-ranked anime from a franchise and defers the rest', () => {
        const ranked = [
            buildCandidate({
                id: 1,
                pahe_id: 'aot-s1',
                relations: [{ pahe_id: 'aot-s2', title: 'Season 2', relation_type: 'Sequel' }],
            }),
            buildCandidate({ id: 2, pahe_id: 'aot-s2' }),
            buildCandidate({ id: 3, pahe_id: 'unrelated-anime' }),
        ]

        const { primary, deferred } = dedupeByRelations(ranked)

        expect(primary.map((c) => c.id)).toEqual([1, 3])
        expect(deferred.map((c) => c.id)).toEqual([2])
    })

    it('keeps everything in primary when nothing is related', () => {
        const ranked = [buildCandidate({ id: 1, pahe_id: 'a' }), buildCandidate({ id: 2, pahe_id: 'b' })]

        const { primary, deferred } = dedupeByRelations(ranked)

        expect(primary.map((c) => c.id)).toEqual([1, 2])
        expect(deferred).toEqual([])
    })

    it('does not mutate the input array', () => {
        const ranked = [buildCandidate({ id: 1, pahe_id: 'a' })]
        const snapshot = JSON.parse(JSON.stringify(ranked))

        dedupeByRelations(ranked)

        expect(ranked).toEqual(snapshot)
    })
})

describe('excludeSelfReferencedTitles', () => {
    it('excludes an anime whose own title is named in the query text', () => {
        const candidates = [
            buildCandidate({ id: 1, title: 'Made in Abyss' }),
            buildCandidate({ id: 2, title: 'Attack on Titan' }),
        ]

        const filtered = excludeSelfReferencedTitles(
            candidates,
            'Made in Abyss has an incredible sense of mystery',
        )

        expect(filtered.map((c) => c.id)).toEqual([2])
    })

    it('matches case-insensitively', () => {
        const candidates = [buildCandidate({ id: 1, title: 'Made in Abyss' })]

        const filtered = excludeSelfReferencedTitles(candidates, 'i loved made in abyss')

        expect(filtered).toEqual([])
    })

    it('also checks title_romaji and synonyms, not just title', () => {
        const candidates = [
            buildCandidate({ id: 1, title: 'Shingeki no Kyojin', title_romaji: 'Attack on Titan' }),
            buildCandidate({ id: 2, title: 'Zombie Land Saga', synonyms: ['Zombieland Saga'] }),
        ]

        const filtered = excludeSelfReferencedTitles(candidates, 'something like attack on titan')

        expect(filtered.map((c) => c.id)).toEqual([2])
    })

    it('ignores titles under 4 characters to avoid false-positive exclusions', () => {
        const candidates = [buildCandidate({ id: 1, title: 'K' })]

        const filtered = excludeSelfReferencedTitles(candidates, 'a story about a detective named k')

        expect(filtered.map((c) => c.id)).toEqual([1])
    })

    it('keeps everything when nothing is self-referenced', () => {
        const candidates = [buildCandidate({ id: 1, title: 'One Piece' })]

        const filtered = excludeSelfReferencedTitles(candidates, 'something with pirates')

        expect(filtered.map((c) => c.id)).toEqual([1])
    })
})
