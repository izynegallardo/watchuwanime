export async function fetchRecommendations() {
    return [
        {
            id: 'placeholder-1',
            title: 'Placeholder Anime One',
            year: 2024,
            genres: ['Sci-Fi', 'Drama'],
            episodeCount: 12,
            avgEpisodeMinutes: 24,
            summary:
                'Mock data until the RAG backend is wired up. Replace fetchRecommendations() with a real API call.',
            imageUrl: 'https://placehold.co/600x338?text=Anime+1',
        },
        {
            id: 'placeholder-2',
            title: 'Placeholder Anime Two',
            year: 2022,
            genres: ['Comedy', 'Fantasy'],
            episodeCount: 1,
            avgEpisodeMinutes: 105,
            summary: 'Second mock entry so the carousel/dots have something to navigate between.',
            imageUrl: 'https://placehold.co/600x338?text=Anime+2',
        },
    ]
}
