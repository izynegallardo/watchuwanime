import { getOpenAIClient } from '../core/openai.js'

const SYSTEM_PROMPT = `
    You are an enthusiastic anime expert talking directly to someone about to pick their next watch.
    You will be given what the person is in the mood for, and a catalog of anime already matched for them.
    For each anime in the catalog, write ONE short, personalized reason (max 7 sentences) this specific
    person would enjoy it, referencing what they said they want.
    Mention the main characters invovled in the story and the main story line from the given synopsis in 2
    to 3 sentences.
    Base every claim only on the provided summary, genres, and status. Never invent plot details.
    Mention airing status only when it adds value, e.g. an ongoing one is still releasing new episodes or
    when there are more related anime based only on the provided relations.
    Every anime given to you already fits a single episode (or the whole runtime, for movies/specials)
    within their available time - for multi-episode series, frame this as "an episode fits your time",
    never imply they can finish the whole series in one sitting.
    Never include or mention what time they have given, e.g. this anime fits your time easily within your
    60-minute limit... instead say 'fits your time'.
    Respond ONLY with valid JSON, no prose, no markdown fences, in this exact shape:
    { "summaries": [ { "id": <id>, "summary": "<text>" } ] }
    Include exactly one entry per anime id given.
`.trim()

function buildCatalogText(matches) {
    return matches
        .map((m) => {
            const length = m.total_minutes
                ? `${m.total_minutes} min total (${m.duration_minutes} min/ep, ${m.episodes ?? 1} eps)`
                : 'unknown length'

            return [
                `id: ${m.id}`,
                `title: ${m.title}`,
                `genres: ${(m.genres || []).join(', ')}`,
                `status: ${m.status || 'unknown'}`,
                `length: ${length}`,
                `summary: ${m.summary || 'N/A'}`,
            ].join('\n')
        })
        .join('\n\n')
}

/**
 * Returns a Map<animeId, personalizedSummary>. Returns an empty Map on
 * any failure so the controller can fall back to the raw synopsis instead
 * of failing the whole request over a formatting glitch.
 */
export async function generatePersonalizedSummaries(query, matches, timeAvailable) {
    if (!matches.length) return new Map()

    const models = (process.env.AI_CHAT_MODEL || 'gemini-3.5-flash-lite')
        .split(',')
        .map((m) => m.trim())

    const openai = getOpenAIClient()

    for (const model of models) {
        try {
            const { choices } = await openai.chat.completions.create({
                model: model,
                response_format: { type: 'json_object' },
                temperature: 0.5,
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: `What the person is looking for:\n${query}\n\nTime available: ${timeAvailable} minutes\n\nCatalog:\n${buildCatalogText(matches)}`,
                    },
                ],
            })

            const choice = choices?.[0]
            if (!choice?.message?.content) {
                throw new Error(
                    `No content returned (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
                )
            }

            const parsed = JSON.parse(choice.message.content)

            return new Map(parsed.summaries.map((s) => [String(s.id), s.summary]))
        } catch (error) {
            console.warn(`Model ${model} failed. Trying next fallback... Error:`, error.message)
        }
    }

    console.error('<error> generatePersonalizedSummaries: All fallback models failed.')
    return new Map()
}
