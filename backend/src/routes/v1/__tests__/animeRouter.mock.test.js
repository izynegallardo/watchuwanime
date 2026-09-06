import { expect, jest } from '@jest/globals'

const mockSearch = jest.fn()
const mockFindByPaheIds = jest.fn()

jest.unstable_mockModule('../../../models/anime.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        search: mockSearch,
        findByPaheIds: mockFindByPaheIds,
    })),
}))

const mockGenerateEmbedding = jest.fn()

jest.unstable_mockModule('../../../services/embedding.js', () => ({
    generateEmbedding: mockGenerateEmbedding,
}))

const mockGeneratePersonalizedSummaries = jest.fn()

jest.unstable_mockModule('../../../services/chat.js', () => ({
    generatePersonalizedSummaries: mockGeneratePersonalizedSummaries,
}))

const { default: request } = await import('supertest')
const { default: app } = await import('../../../app.js')

const apikey = process.env.API_KEY

function unitVector(index) {
    const values = new Array(384).fill(0)
    values[index] = 1
    return values
}

function buildMatch(overrides = {}) {
    return {
        id: 1,
        pahe_id: 'pahe-1',
        title: 'Test Anime',
        title_romaji: null,
        title_japanese: null,
        synonyms: [],
        type: 'TV',
        year: 2020,
        genres: ['Action'],
        summary: 'A test summary.',
        status: 'Finished Airing',
        image_url: 'https://example.com/image.jpg',
        youtube_url: null,
        duration_minutes: 24,
        episodes: 1,
        total_minutes: 24,
        relations: [],
        recommendations: [],
        similarity: 0.8,
        embedding: unitVector(0),
        ...overrides,
    }
}

// Builds `count` distinct matches (unique id/pahe_id/embedding, starting at
// startId) so mmrRerank can fill RESULT_COUNT (10) on its own without the
// widen/backfill fallback paths kicking in - those get their own dedicated
// tests below.
function buildMatches(count, { startId = 1, ...overrides } = {}) {
    return Array.from({ length: count }, (_, i) => {
        const id = startId + i
        return buildMatch({
            id,
            pahe_id: `pahe-${id}`,
            similarity: 0.9 - id * 0.01,
            embedding: unitVector(id),
            ...overrides,
        })
    })
}

describe('POST /api/v1/anime/recommend', () => {
    beforeEach(() => {
        mockSearch.mockReset()
        mockFindByPaheIds.mockReset()
        mockGenerateEmbedding.mockReset()
        mockGeneratePersonalizedSummaries.mockReset()
    })

    it('returns structured recommendations built from the matched anime', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue(buildMatches(10))
        mockGeneratePersonalizedSummaries.mockResolvedValue(
            new Map([[1, 'Personalized reason for anime 1.']]),
        )

        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ genres: ['Action'], answer: 'Something intense and short' }],
                timeAvailable: 60,
            })

        expect(response.statusCode).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.recommendations).toHaveLength(10)
        expect(response.body.recommendations.find((r) => r.id === 1)).toMatchObject({
            id: 1,
            title: 'Test Anime',
            summary: 'Personalized reason for anime 1.',
        })
    })

    it('falls back to the raw summary when no personalized summary was generated', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue(buildMatches(10, { summary: 'Raw summary text.' }))
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ answer: 'Anything goes' }],
                timeAvailable: 60,
            })

        expect(response.statusCode).toBe(200)
        expect(response.body.recommendations[0].summary).toBe('Raw summary text.')
    })

    it('rejects a request with no answers, without touching the model', async () => {
        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({ answers: [], timeAvailable: 60 })

        expect(response.statusCode).toBe(400)
        expect(mockSearch).not.toHaveBeenCalled()
    })

    it('rejects a request missing timeAvailable', async () => {
        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({ answers: [{ answer: 'Something fun' }] })

        expect(response.statusCode).toBe(400)
        expect(mockSearch).not.toHaveBeenCalled()
    })

    it('rejects requests without a valid apikey', async () => {
        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .send({ answers: [{ answer: 'Something fun' }], timeAvailable: 60 })

        expect(response.statusCode).toBe(401)
        expect(mockSearch).not.toHaveBeenCalled()
    })

    it('passes excludeIds and the default mature-genre exclusion through to the model search call', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue(buildMatches(10))
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ answer: 'Something fun' }],
                timeAvailable: 60,
                excludeIds: [10, 20],
            })

        expect(mockSearch).toHaveBeenCalledWith(
            [0.1, 0.2, 0.3],
            expect.objectContaining({ excludeIds: [10, 20], excludeGenres: ['Ecchi'] }),
        )
    })

    it('allows Ecchi through when allowMatureGenres is true', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue(buildMatches(10))
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ answer: 'Something fun' }],
                timeAvailable: 60,
                allowMatureGenres: true,
            })

        expect(mockSearch).toHaveBeenCalledWith(
            [0.1, 0.2, 0.3],
            expect.objectContaining({ excludeGenres: [] }),
        )
    })

    it('widens the search when the first pass returns fewer than 10 distinct matches', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch
            .mockResolvedValueOnce(buildMatches(3))
            .mockResolvedValueOnce(buildMatches(7, { startId: 4 }))
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ answer: 'Something fun' }],
                timeAvailable: 60,
            })

        expect(mockSearch).toHaveBeenCalledTimes(2)
        expect(response.body.recommendations).toHaveLength(10)
    })

    it('backfills from relations/recommendations when even the widened search falls short', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        const short = buildMatches(2, {
            relations: [{ pahe_id: 'related-1', title: 'Related One' }],
        })
        mockSearch.mockResolvedValueOnce(short).mockResolvedValueOnce([])
        mockFindByPaheIds.mockResolvedValue(
            Array.from({ length: 8 }, (_, i) => ({
                id: 200 + i,
                pahe_id: `related-${i}`,
                title: `Backfill ${i}`,
                genres: ['Action'],
                duration_minutes: 24,
                total_minutes: 24,
            })),
        )
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ answer: 'Something fun' }],
                timeAvailable: 60,
            })

        expect(mockFindByPaheIds).toHaveBeenCalled()
        expect(response.body.recommendations).toHaveLength(10)
    })

    it('excludes an anime whose own title is named in the answer text, even if it is the top match', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch
            .mockResolvedValueOnce([
                buildMatch({ id: 1, pahe_id: 'pahe-1', title: 'Made in Abyss', similarity: 0.95 }),
                ...buildMatches(9, { startId: 2 }),
            ])
            .mockResolvedValueOnce(buildMatches(1, { startId: 11 }))
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [
                    {
                        answer:
                            'Made in Abyss has an incredible sense of mystery because the world feels much larger and more dangerous than the characters understand',
                    },
                ],
                timeAvailable: 60,
            })

        expect(response.body.recommendations).toHaveLength(10)
        expect(response.body.recommendations.some((r) => r.title === 'Made in Abyss')).toBe(false)
    })
})
