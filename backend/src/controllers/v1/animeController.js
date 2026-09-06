import Anime from '../../models/anime.js'
import { recommendSchema } from '../../schemas/animeSchema.js'
import { generateEmbedding } from '../../services/embedding.js'
import { generatePersonalizedSummaries } from '../../services/chat.js'
import {
    rankByFit,
    mmrRerank,
    dedupeByRelations,
    excludeSelfReferencedTitles,
    SHORT_SESSION_MINUTES,
} from '../../services/ranking.js'
import { responseError } from '../../utils/error.js'

const RESULT_COUNT = 10
const CANDIDATE_POOL_SIZE = RESULT_COUNT * 5
const WIDE_POOL_SIZE = RESULT_COUNT * 15
const RELAXED_MATCH_THRESHOLD = 0.15

// Excluded from every search unless the request opts in via allowMatureGenres.
// Add more genre strings here if the dataset ever introduces further mature tags.
const MATURE_GENRES = ['Ecchi']

// Which ranking factors apply on top of raw similarity.
// Empty array skips reranking entirely and falls back to pure similarity order.
const ENABLED_RANK_FACTORS = ['duration', 'status']

function buildQueryText(answers) {
    return answers
        .map(({ genres, answer }) => (genres.length ? `${genres.join(', ')}: ${answer}` : answer))
        .join('\n')
}

// Hard-filters out self-referenced and out-of-time candidates, ranks by
// fit, then splits out same-franchise repeats (dedupeByRelations) so a
// single series can't crowd the top results. Returns { primary, deferred }.
function buildPools(candidates, timeAvailable, queryText) {
    const notSelfReferenced = excludeSelfReferencedTitles(candidates, queryText)

    const withinTime = notSelfReferenced.filter((match) => {
        const useEpisodeLength = timeAvailable <= SHORT_SESSION_MINUTES
        const minutes = useEpisodeLength ? match.duration_minutes : match.total_minutes
        return !minutes || minutes <= timeAvailable
    })

    const ranked = rankByFit(withinTime, { timeAvailable }, ENABLED_RANK_FACTORS)
    return dedupeByRelations(ranked)
}

class AnimeController {
    constructor() {
        this.anime = new Anime()
    }

    async recommend(request, response) {
        try {
            const { answers, timeAvailable, excludeIds, allowMatureGenres } = recommendSchema.parse(
                request.body,
            )
            const excludeGenres = allowMatureGenres ? [] : MATURE_GENRES

            const queryText = buildQueryText(answers)
            const vector = await generateEmbedding(queryText)

            let candidates = await this.anime.search(vector, {
                excludeIds,
                excludeGenres,
                matchCount: CANDIDATE_POOL_SIZE,
            })
            let { primary, deferred } = buildPools(candidates, timeAvailable, queryText)

            // Step 1 (guarantee-10, part A): not enough distinct-franchise
            // matches yet - widen the pool and relax the similarity threshold
            // before ever touching relations/recommendations, so vector search
            // itself still does as much of the work as possible.
            if (primary.length < RESULT_COUNT) {
                const seenIds = candidates.map((match) => match.id)
                const wider = await this.anime.search(vector, {
                    excludeIds: [...excludeIds, ...seenIds],
                    excludeGenres,
                    matchCount: WIDE_POOL_SIZE,
                    matchThreshold: RELAXED_MATCH_THRESHOLD,
                })
                candidates = [...candidates, ...wider]
                ;({ primary, deferred } = buildPools(candidates, timeAvailable, queryText))
            }

            let matches = mmrRerank(
                primary.length >= RESULT_COUNT ? primary : [...primary, ...deferred],
                RESULT_COUNT,
            )

            // Step 2 (guarantee-10, part B): last resort, only reached if the
            // dataset itself can't supply RESULT_COUNT distinct anime within
            // timeAvailable. Pulls from relations/recommendations of what we
            // already matched - never used to seed or bias the vector search.
            if (matches.length < RESULT_COUNT) {
                matches = await this.#backfillFromRelated(matches, [...primary, ...deferred], {
                    excludeIds,
                    excludeGenres,
                    timeAvailable,
                    queryText,
                })
            }

            const summaries = await generatePersonalizedSummaries(queryText, matches, timeAvailable)

            const recommendations = matches.map((match) => ({
                id: match.id,
                title: match.title,
                titleRomaji: match.title_romaji,
                titleJapanese: match.title_japanese,
                synonyms: match.synonyms,
                type: match.type,
                aired_from: match.aired_from,
                aired_to: match.aired_to,
                year: match.year,
                season: match.season,
                genres: match.genres,
                themes: match.themes,
                demographics: match.demographics,
                studios: match.studios,
                episodes: match.episodes,
                durationMinutes: match.duration_minutes,
                totalMinutes: match.total_minutes,
                status: match.status,
                imageUrl: match.image_url,
                youtubeUrl: match.youtube_url,
                external_links: match.external_links,
                summary: summaries.get(match.id) ?? match.summary,
                synopsis: match.summary,
            }))

            response.status(200).json({
                success: true,
                recommendations,
            })
        } catch (error) {
            responseError(response, error)
        }
    }

    async #backfillFromRelated(
        matches,
        pool,
        { excludeIds, excludeGenres, timeAvailable, queryText },
    ) {
        const seedPaheIds = new Set()
        for (const match of pool) {
            for (const ref of [...(match.relations ?? []), ...(match.recommendations ?? [])]) {
                seedPaheIds.add(ref.pahe_id)
            }
        }
        if (!seedPaheIds.size) return matches

        const found = await this.anime.findByPaheIds([...seedPaheIds])
        const fallbackCandidates = excludeSelfReferencedTitles(found, queryText)
        const selectedIds = new Set(matches.map((match) => match.id))
        const excludedIdSet = new Set(excludeIds)
        const useEpisodeLength = timeAvailable <= SHORT_SESSION_MINUTES
        const result = [...matches]

        for (const candidate of fallbackCandidates) {
            if (result.length >= RESULT_COUNT) break
            if (selectedIds.has(candidate.id) || excludedIdSet.has(candidate.id)) continue

            const minutes = useEpisodeLength ? candidate.duration_minutes : candidate.total_minutes
            if (minutes && minutes > timeAvailable) continue
            if (excludeGenres.length && candidate.genres?.some((g) => excludeGenres.includes(g)))
                continue

            result.push(candidate)
            selectedIds.add(candidate.id)
        }

        return result
    }
}

export default AnimeController
