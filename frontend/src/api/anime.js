import apiClient from '@/lib/axios'

export async function fetchRecommendations(answers, timeAvailable, excludeIds = []) {
    const response = await apiClient.post('/anime/recommend', {
        answers,
        timeAvailable,
        excludeIds,
    })

    return response.data.recommendations
}
