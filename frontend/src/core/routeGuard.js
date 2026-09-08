import {
    recommendations,
    setSelectedGenres,
    setAnswer,
    setSessionAnswers,
    setCurrentUserIndex,
    setRecommendations,
    setShownIds,
} from '@/store/counter'

function resetSession() {
    setSelectedGenres([])
    setAnswer('')
    setSessionAnswers([])
    setCurrentUserIndex(0)
    setRecommendations([])
    setShownIds([])
}

export function requireRecommendations() {
    if (recommendations().length > 0) return true
    resetSession()
    return false
}
