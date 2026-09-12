import apiClient from '@/lib/axios'
import { query, TTL } from '@/core/cache'

export async function fetchRecommendations(
    answers,
    timeAvailable,
    excludeIds = [],
    allowMatureGenres = false,
) {
    const response = await apiClient.post('/anime/recommend', {
        answers,
        timeAvailable,
        excludeIds,
        allowMatureGenres,
    })

    return response.data.recommendations
}

export async function fetchAnimeRelations(paheId) {
    const response = await apiClient.get(`/anime/${paheId}/relations`)
    return response.data.relations
}

export async function fetchAnimeByPaheId(paheId) {
    // Anime details rarely change and paheId is stable, so cache for the
    // whole session - resultPage, animePage, and the Saved page all end up
    // sharing one fetch per anime instead of re-requesting the same data.
    return query(
        `anime:${paheId}`,
        async () => {
            const response = await apiClient.get(`/anime/${paheId}`)
            return response.data.anime
        },
        { staleTime: TTL.SESSION },
    )
}
