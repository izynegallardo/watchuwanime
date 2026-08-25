import { GENRES } from '@/data/genres'

const BATCH_SIZE = 10

// 30 entries = 3 full batches of 10, matching the shownIds cap in
// summaryPage/event.js (canMore = shownIds().length < 30). Once the real
// /recommend endpoint exists this whole pool goes away.
function buildPool() {
    return Array.from({ length: 30 }, (_, i) => {
        const n = i + 1
        const isMovie = n % 5 === 0

        return {
            id: `placeholder-${n}`,
            title: `Placeholder Anime ${n}`,
            year: 2015 + (n % 10),
            genres: [GENRES[n % GENRES.length], GENRES[(n + 3) % GENRES.length]],
            episodeCount: isMovie ? 1 : (n % 12) + 6,
            avgEpisodeMinutes: isMovie ? 90 + (n % 4) * 10 : 24,
            summary: `Mock data until the RAG backend is wired up. Entry #${n} of the placeholder pool.`,
            imageUrl: `https://placehold.co/600x338?text=Anime+${n}`,
        }
    })
}

const POOL = buildPool()

// TODO: replace with a real call once the backend /recommend endpoint exists
// (see Project Plan: chat prompt design + Render deployment are still pending).
// excludeIds mirrors the demo's shownIds exclusion so "More Recommendations"
// doesn't repeat anime already shown earlier in the session.
export async function fetchRecommendations(excludeIds = []) {
    const excluded = new Set(excludeIds)

    return POOL.filter((anime) => !excluded.has(anime.id)).slice(0, BATCH_SIZE)
}
