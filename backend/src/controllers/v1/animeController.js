import Anime from '../../models/anime.js'
import { recommendSchema } from '../../schemas/animeSchema.js'
import { generateEmbedding } from '../../services/embedding.js'
import { generatePersonalizedSummaries } from '../../services/chat.js'
import { rankByFit, mmrRerank } from '../../services/ranking.js'
import { responseError } from '../../utils/error.js'

const RESULT_COUNT = 10
const CANDIDATE_POOL_SIZE = RESULT_COUNT * 5

// Which ranking factors apply on top of raw similarity. Empty array skips
// reranking entirely and falls back to pure similarity order.
const ENABLED_RANK_FACTORS = ['duration', 'quality', 'status']

function buildQueryText(answers) {
    return answers
        .map(({ genres, answer }) => (genres.length ? `${genres.join(', ')}: ${answer}` : answer))
        .join('\n')
}

class AnimeController {
    constructor() {
        this.anime = new Anime()
    }

    async recommend(request, response) {
        try {
            const { answers, timeAvailable, excludeIds } = recommendSchema.parse(request.body)

            const queryText = buildQueryText(answers)
            const vector = await generateEmbedding(queryText)
            const candidates = await this.anime.search(vector, {
                excludeIds,
                matchCount: CANDIDATE_POOL_SIZE,
            })
            const withinTime = candidates.filter(
                (match) => !match.total_minutes || match.total_minutes <= timeAvailable,
            )
            const ranked = rankByFit(withinTime, { timeAvailable }, ENABLED_RANK_FACTORS)
            const matches = mmrRerank(ranked, RESULT_COUNT)
            const summaries = await generatePersonalizedSummaries(queryText, matches, timeAvailable)

            const recommendations = matches.map((match) => ({
                id: match.id,
                title: match.title,
                titleEnglish: match.title_english,
                type: match.type,
                year: match.year,
                genres: match.genres,
                episodes: match.episodes,
                durationMinutes: match.duration_minutes,
                rating: match.rating,
                status: match.status,
                imageUrl: match.image_url,
                summary: summaries.get(match.id) ?? match.synopsis,
                synopsis: match.synopsis,
            }))

            response.status(200).json({
                success: true,
                recommendations,
            })
        } catch (error) {
            responseError(response, error)
        }
    }
}

export default AnimeController
