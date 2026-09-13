import { z } from 'zod'

const answerSchema = z.object({
    genres: z.array(z.string()).default([]),
    answer: z.string().min(1).max(2000),
})

export const recommendSchema = z.object({
    answers: z.array(answerSchema).min(1),
    timeAvailable: z.number().int().positive(),
    excludeIds: z.array(z.coerce.number().int()).optional().default([]),
    // Off by default - frontend must explicitly opt in before Ecchi (or any
    // future mature genre added to MATURE_GENRES in animeController.js) is allowed.
    allowMatureGenres: z.boolean().optional().default(false),
    // Off by default - each entry opts one side-story type (Special/ONA/OVA,
    // see SIDE_STORY_TYPES in animeController.js) back into results.
    allowedSideStoryTypes: z.array(z.string()).optional().default([]),
})

export const animeIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export const animePaheIdParamSchema = z.object({
    paheId: z.string().min(1),
})
