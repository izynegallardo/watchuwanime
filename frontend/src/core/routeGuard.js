import {
    sessionAnswers,
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

// Deliberately checks sessionAnswers, not recommendations. recommendations
// legitimately becomes [] once "More" exhausts the dataset - that's not an
// invalid state, resultPage's own renderEmpty() is supposed to handle it.
// sessionAnswers only clears on a real reset (home, or this guard itself),
// so it's the right signal for "did a real quiz session ever happen".
export function requireRecommendations() {
    if (sessionAnswers().length > 0) return true
    resetSession()
    return false
}
