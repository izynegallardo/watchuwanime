import { expect, jest } from '@jest/globals'

const mockSearch = jest.fn()

jest.unstable_mockModule('../../../models/anime.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        search: mockSearch,
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

function buildMatch(overrides = {}) {
    return {
        id: 1,
        title: 'Test Anime',
        title_english: null,
        type: 'TV',
        year: 2020,
        genres: ['Action'],
        synopsis: 'A test synopsis.',
        rating: 'PG-13',
        score: 8,
        popularity: 100,
        status: 'Finished Airing',
        image_url: 'https://example.com/image.jpg',
        duration_minutes: 24,
        episodes: 12,
        total_minutes: 288,
        similarity: 0.8,
        ...overrides,
    }
}

describe('POST /api/v1/anime/recommend', () => {
    beforeEach(() => {
        mockSearch.mockReset()
        mockGenerateEmbedding.mockReset()
        mockGeneratePersonalizedSummaries.mockReset()
    })

    it('returns structured recommendations built from the matched anime', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue([buildMatch()])
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
        expect(response.body.data.recommendations).toHaveLength(1)
        expect(response.body.data.recommendations[0]).toMatchObject({
            id: 1,
            title: 'Test Anime',
            summary: 'Personalized reason for anime 1.',
        })
    })

    it('falls back to the raw synopsis when no personalized summary was generated', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue([buildMatch({ id: 2, synopsis: 'Raw synopsis text.' })])
        mockGeneratePersonalizedSummaries.mockResolvedValue(new Map())

        const response = await request(app)
            .post('/api/v1/anime/recommend')
            .set('apikey', apikey)
            .send({
                answers: [{ answer: 'Anything goes' }],
                timeAvailable: 60,
            })

        expect(response.statusCode).toBe(200)
        expect(response.body.data.recommendations[0].summary).toBe('Raw synopsis text.')
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

    it('passes excludeIds through to the model search call', async () => {
        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
        mockSearch.mockResolvedValue([])
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
            expect.objectContaining({ excludeIds: [10, 20] }),
        )
    })
})
