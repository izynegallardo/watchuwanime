import { recommendSchema } from '../animeSchema.js'

describe('recommendSchema', () => {
    it('accepts a valid payload', () => {
        const result = recommendSchema.safeParse({
            answers: [{ genres: ['Action'], answer: 'Something intense' }],
            timeAvailable: 60,
        })

        expect(result.success).toBe(true)
        expect(result.data.excludeIds).toEqual([])
    })

    it('defaults genres to an empty array when omitted', () => {
        const result = recommendSchema.safeParse({
            answers: [{ answer: 'Anything chill' }],
            timeAvailable: 20,
        })

        expect(result.success).toBe(true)
        expect(result.data.answers[0].genres).toEqual([])
    })

    it('rejects an empty answers array', () => {
        const result = recommendSchema.safeParse({ answers: [], timeAvailable: 60 })

        expect(result.success).toBe(false)
    })

    it('rejects a blank answer string', () => {
        const result = recommendSchema.safeParse({
            answers: [{ answer: '' }],
            timeAvailable: 60,
        })

        expect(result.success).toBe(false)
    })

    it('rejects a missing timeAvailable', () => {
        const result = recommendSchema.safeParse({
            answers: [{ answer: 'Something fun' }],
        })

        expect(result.success).toBe(false)
    })

    it('rejects a negative timeAvailable', () => {
        const result = recommendSchema.safeParse({
            answers: [{ answer: 'Something fun' }],
            timeAvailable: -10,
        })

        expect(result.success).toBe(false)
    })

    it('passes through excludeIds when provided', () => {
        const result = recommendSchema.safeParse({
            answers: [{ answer: 'Something fun' }],
            timeAvailable: 60,
            excludeIds: [1, 2, 3],
        })

        expect(result.success).toBe(true)
        expect(result.data.excludeIds).toEqual([1, 2, 3])
    })
})
