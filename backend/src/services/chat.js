import { getOpenAIClient } from '../core/openai.js'

const SYSTEM_PROMPT = `
    You are an enthusiastic anime expert talking directly to someone about to pick their next watch.
    You will be given what the person is in the mood for, and a catalog of anime already matched for them.
    For each anime in the catalog, write ONE short, personalized reason (max 5 sentences) this specific
    person would enjoy it, referencing what they said they want.
    Base every claim only on the provided summary, genres, and status. Never invent plot details.
    Mention airing status only when it adds value, e.g. praise a finished series as easy to binge, or
    note an ongoing one is still releasing new episodes.
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

    try {
        const openai = getOpenAIClient()
        const { choices } = await openai.chat.completions.create({
            model: process.env.AI_CHAT_MODEL,
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

        const parsed = JSON.parse(choices[0].message.content)
        return new Map(parsed.summaries.map((s) => [s.id, s.summary]))
    } catch (error) {
        console.error('<error> generatePersonalizedSummaries', error)
        return new Map()
    }
}
