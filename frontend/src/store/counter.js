import { useState } from '@/core/useState'

export const [count, setCount] = useState(0)

export const [viewerCount, setViewerCount, subscribeViewerCount] = useState(1)
export const [timeIndex, setTimeIndex, subscribeTimeIndex] = useState(0)
export const [selectedGenres, setSelectedGenres, subscribeSelectedGenres] = useState([])
export const [currentUserIndex, setCurrentUserIndex, subscribeCurrentUserIndex] = useState(0)
export const [answer, setAnswer, subscribeAnswer] = useState('')
export const [recommendations, setRecommendations, subscribeRecommendations] = useState([])
export const [shownIds, setShownIds, subscribeShownIds] = useState([])
