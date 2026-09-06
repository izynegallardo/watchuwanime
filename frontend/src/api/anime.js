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
