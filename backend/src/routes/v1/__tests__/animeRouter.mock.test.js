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

beforeEach(() => {
    mockSearch.mockReset()
    mockFindByPaheIds.mockReset()
    mockGenerateEmbedding.mockReset()
    mockGeneratePersonalizedSummaries.mockReset()
})

describe('POST /api/v1/anime/recommend', () => {
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

describe('GET /api/v1/anime/:paheId/relations', () => {
    it('groups hydrated relations by relation_type in display order', async () => {
        mockFindByPaheIds
            .mockResolvedValueOnce([
                {
                    id: 1,
                    pahe_id: 'pahe-1',
                    relations: [
                        { pahe_id: 'pahe-side', title: 'Side Story Anime', relation_type: 'Side Story' },
                        { pahe_id: 'pahe-sequel', title: 'Sequel Anime', relation_type: 'Sequel' },
                    ],
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 20,
                    pahe_id: 'pahe-side',
                    title: 'Side Story Anime',
                    title_romaji: null,
                    type: 'OVA',
                    episodes: 2,
                    status: 'Finished Airing',
                    season: 'Winter 2015',
                    image_url: 'https://example.com/side.jpg',
                },
                {
                    id: 21,
                    pahe_id: 'pahe-sequel',
                    title: 'Sequel Anime',
                    title_romaji: null,
                    type: 'TV',
                    episodes: 12,
                    status: 'Finished Airing',
                    season: 'Spring 2017',
                    image_url: 'https://example.com/sequel.jpg',
                },
            ])

        const response = await request(app)
            .get('/api/v1/anime/pahe-1/relations')
            .set('apikey', apikey)

        expect(response.statusCode).toBe(200)
        expect(response.body.success).toBe(true)
        // Sequel must come before Side Story - RELATION_TYPE_ORDER, not the
        // order they appeared in the source anime's own relations array.
        expect(response.body.relations.map((group) => group.relationType)).toEqual([
            'Sequel',
            'Side Story',
        ])
        expect(response.body.relations[0].anime).toEqual([
            expect.objectContaining({ id: 21, paheId: 'pahe-sequel', title: 'Sequel Anime' }),
        ])
    })

    it('returns an empty array without a second findByPaheIds call when the anime has no relations', async () => {
        mockFindByPaheIds.mockResolvedValueOnce([{ id: 1, pahe_id: 'pahe-1', relations: [] }])

        const response = await request(app)
            .get('/api/v1/anime/pahe-1/relations')
            .set('apikey', apikey)

        expect(response.statusCode).toBe(200)
        expect(response.body.relations).toEqual([])
        expect(mockFindByPaheIds).toHaveBeenCalledTimes(1)
    })

    it('returns 404 when the pahe_id does not exist, without a hydration call', async () => {
        mockFindByPaheIds.mockResolvedValueOnce([])

        const response = await request(app)
            .get('/api/v1/anime/does-not-exist/relations')
            .set('apikey', apikey)

        expect(response.statusCode).toBe(404)
        expect(mockFindByPaheIds).toHaveBeenCalledTimes(1)
    })

    it('rejects requests without a valid apikey', async () => {
        const response = await request(app).get('/api/v1/anime/pahe-1/relations')

        expect(response.statusCode).toBe(401)
        expect(mockFindByPaheIds).not.toHaveBeenCalled()
    })

    it('keeps an unrecognized relation_type as its own group, sorted to the end', async () => {
        mockFindByPaheIds
            .mockResolvedValueOnce([
                {
                    id: 1,
                    pahe_id: 'pahe-1',
                    relations: [
                        { pahe_id: 'pahe-x', title: 'Something Else', relation_type: 'Made Up Type' },
                    ],
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 30,
                    pahe_id: 'pahe-x',
                    title: 'Something Else',
                    title_romaji: null,
                    type: 'TV',
                    episodes: 1,
                    status: 'Finished Airing',
                    season: null,
                    image_url: 'https://example.com/x.jpg',
                },
            ])

        const response = await request(app)
            .get('/api/v1/anime/pahe-1/relations')
            .set('apikey', apikey)

        expect(response.body.relations).toEqual([
            { relationType: 'Made Up Type', anime: expect.any(Array) },
        ])
    })
})

describe('GET /api/v1/anime/:paheId', () => {
    it('returns the anime detail mapped in the same shape recommend() uses', async () => {
        mockFindByPaheIds.mockResolvedValue([
            buildMatch({ id: 5, pahe_id: 'made-in-abyss', title: 'Made in Abyss' }),
        ])

        const response = await request(app)
            .get('/api/v1/anime/made-in-abyss')
            .set('apikey', apikey)

        expect(response.statusCode).toBe(200)
        expect(mockFindByPaheIds).toHaveBeenCalledWith(['made-in-abyss'])
        expect(response.body.anime).toMatchObject({
            id: 5,
            paheId: 'made-in-abyss',
            title: 'Made in Abyss',
            summary: 'A test summary.',
        })
        // synopsis must NOT duplicate summary here - there's no AI-personalized
        // version to distinguish it from on this endpoint (unlike recommend()),
        // so showing both would just render the same paragraph twice.
        expect(response.body.anime.synopsis).toBeNull()
    })

    it('returns 404 when no anime matches the pahe_id', async () => {
        mockFindByPaheIds.mockResolvedValue([])

        const response = await request(app)
            .get('/api/v1/anime/does-not-exist')
            .set('apikey', apikey)

        expect(response.statusCode).toBe(404)
    })

    it('rejects requests without a valid apikey', async () => {
        const response = await request(app).get('/api/v1/anime/made-in-abyss')

        expect(response.statusCode).toBe(401)
        expect(mockFindByPaheIds).not.toHaveBeenCalled()
    })
})
