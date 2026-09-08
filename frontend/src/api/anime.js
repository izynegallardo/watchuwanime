import apiClient from '@/lib/axios'

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

export async function fetchAnimeRelations(id) {
    const response = await apiClient.get(`/anime/${id}/relations`)
    return response.data.relations
}

export async function fetchAnimeByPaheId(paheId) {
    const response = await apiClient.get(`/anime/${paheId}`)
    return response.data.anime
}
