import { useState } from '@/core/useState'

export const [count, setCount] = useState(0)

export const [viewerCount, setViewerCount, subscribeViewerCount] = useState(1)
export const [timeIndex, setTimeIndex, subscribeTimeIndex] = useState(0)
// Set once at home, alongside viewerCount/timeIndex - persists for the whole
// session rather than resetting per-user like selectedGenres/answer do.
export const [allowMatureGenres, setAllowMatureGenres, subscribeAllowMatureGenres] = useState(false)
// Same lifetime as allowMatureGenres above - persists for the session, holds
// which side-story types (Special/ONA/OVA) are opted back in. Empty by default.
export const [allowedSideStoryTypes, setAllowedSideStoryTypes, subscribeAllowedSideStoryTypes] =
    useState([])
export const [selectedGenres, setSelectedGenres, subscribeSelectedGenres] = useState([])
export const [currentUserIndex, setCurrentUserIndex, subscribeCurrentUserIndex] = useState(0)
export const [answer, setAnswer, subscribeAnswer] = useState('')
export const [sessionAnswers, setSessionAnswers, subscribeSessionAnswers] = useState([])
export const [recommendations, setRecommendations, subscribeRecommendations] = useState([])
export const [shownIds, setShownIds, subscribeShownIds] = useState([])
