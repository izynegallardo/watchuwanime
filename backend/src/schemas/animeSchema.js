import { z } from 'zod'

const answerSchema = z.object({
    genres: z.array(z.string()).default([]),
    answer: z.string().min(1).max(2000),
})

export const recommendSchema = z.object({
    answers: z.array(answerSchema).min(1),
    timeAvailable: z.number().int().positive(),
    excludeIds: z.array(z.number().int()).optional().default([]),
})
