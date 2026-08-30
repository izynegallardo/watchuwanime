import { rankByFit } from '../ranking.js'

function buildCandidate(overrides = {}) {
    return {
        id: 1,
        similarity: 0.5,
        total_minutes: null,
        score: null,
        popularity: null,
        status: null,
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

    it('boosts a candidate whose duration is a closer fit to the available time', () => {
        const candidates = [
            buildCandidate({ id: 'too-long', similarity: 0.6, total_minutes: 600 }),
            buildCandidate({ id: 'good-fit', similarity: 0.6, total_minutes: 60 }),
        ]

        const ranked = rankByFit(candidates, { timeAvailable: 60 }, ['duration'])

        expect(ranked[0].id).toBe('good-fit')
    })

    it('treats unknown duration as neutral rather than penalizing it', () => {
        const candidates = [
            buildCandidate({ id: 'unknown', similarity: 0.6, total_minutes: null }),
            buildCandidate({ id: 'bad-fit', similarity: 0.6, total_minutes: 1000 }),
        ]

        const ranked = rankByFit(candidates, { timeAvailable: 60 }, ['duration'])

        expect(ranked[0].id).toBe('unknown')
    })

    it('favors higher score and popularity when the quality factor is enabled', () => {
        const candidates = [
            buildCandidate({ id: 'low', similarity: 0.6, score: 5, popularity: 5000 }),
            buildCandidate({ id: 'high', similarity: 0.6, score: 9, popularity: 50 }),
        ]

        const ranked = rankByFit(candidates, {}, ['quality'])

        expect(ranked[0].id).toBe('high')
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
                total_minutes: 1200,
                score: 4,
                popularity: 9000,
                status: 'Discontinued',
            }),
            buildCandidate({
                id: 'lower-similarity-great-fit',
                similarity: 0.6,
                total_minutes: 60,
                score: 9,
                popularity: 10,
                status: 'Finished Airing',
            }),
        ]

        const ranked = rankByFit(candidates, { timeAvailable: 60 }, [
            'duration',
            'quality',
            'status',
        ])

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

        rankByFit(candidates, {}, ['quality'])

        expect(candidates).toEqual(snapshot)
    })
})
