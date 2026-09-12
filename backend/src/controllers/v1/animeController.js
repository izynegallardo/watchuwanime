import Anime from '../../models/anime.js'
import {
    recommendSchema,
    animePaheIdParamSchema,
} from '../../schemas/animeSchema.js'
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

// Display order for the relations tab - matches how sites like AniList group
// these (direct continuations first, tangential entries like OSTs/parodies
// last). Anything not listed here falls to the end via relationTypeRank().
const RELATION_TYPE_ORDER = [
    'Sequel',
    'Prequel',
    'Side Story',
    'Spin-off',
    'Alternative Version',
    'Alternative Setting',
    'Parent Story',
    'Full Story',
    'Summary',
    'Adaptation',
    'Character',
    'Other',
]

function relationTypeRank(relationType) {
    const index = RELATION_TYPE_ORDER.indexOf(relationType)
    return index === -1 ? RELATION_TYPE_ORDER.length : index
}

// Shared between recommend() and show() so both endpoints return anime in
// the exact same shape - card/main.js and animePage can then both consume
// it without caring which endpoint it came from. `overrides` is how
// recommend() substitutes in the AI-personalized summary; show() has no
// question context to personalize against, so it just uses the raw fields.
function mapAnimeDetail(match, overrides = {}) {
    return {
        id: match.id,
        paheId: match.pahe_id,
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
        summary: match.summary,
        synopsis: match.summary,
        relations: match.relations,
        ...overrides,
    }
}

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

            const recommendations = matches.map((match) =>
                mapAnimeDetail(match, { summary: summaries.get(String(match.id)) ?? '' }),
            )

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

    /**
     * GET /:id/relations - lazily resolved, only called by the frontend when
     * the person actually opens the Relations tab for a given anime. Reads
     * that anime's own `relations` pointers (pahe_id + relation_type only),
     * then hydrates each into full display data via a join against our own
     * table (see findByPaheIds) rather than trusting anything denormalized
     * in the dataset itself - keeps this always in sync with what we've
     * actually ingested, with zero extra dataset/ingestion work.
     */
    async relations(request, response) {
        try {
            const { paheId } = animePaheIdParamSchema.parse(request.params)

            const [source] = await this.anime.findByPaheIds([paheId])
            if (!source) {
                return response.status(404).json({ success: false, message: 'Anime not found' })
            }

            const relationRefs = source.relations ?? []
            if (!relationRefs.length) {
                return response.status(200).json({ success: true, relations: [] })
            }

            const relationTypeByPaheId = new Map(
                relationRefs.map((ref) => [ref.pahe_id, ref.relation_type || 'Other']),
            )
            const hydrated = await this.anime.findByPaheIds([...relationTypeByPaheId.keys()])

            const grouped = new Map()
            for (const related of hydrated) {
                const relationType = relationTypeByPaheId.get(related.pahe_id) || 'Other'
                if (!grouped.has(relationType)) grouped.set(relationType, [])

                grouped.get(relationType).push({
                    id: related.id,
                    paheId: related.pahe_id,
                    title: related.title,
                    titleRomaji: related.title_romaji,
                    type: related.type,
                    episodes: related.episodes,
                    status: related.status,
                    season: related.season,
                    imageUrl: related.image_url,
                })
            }

            const relations = [...grouped.entries()]
                .sort(([a], [b]) => relationTypeRank(a) - relationTypeRank(b))
                .map(([relationType, anime]) => ({ relationType, anime }))

            response.status(200).json({ success: true, relations })
        } catch (error) {
            responseError(response, error)
        }
    }

    /**
     * GET /:paheId - the animePage detail view. Keyed by pahe_id rather
     * than the internal bigint id, since the id is sequential and
     * trivially guessable/enumerable in a URL a person can see and share;
     * pahe_id carries no positional information. No AI summary is computed
     * here (that only makes sense against a question's context, which this
     * endpoint doesn't have) - synopsis is explicitly nulled out too,
     * otherwise it'd duplicate the identical raw text mapAnimeDetail's
     * default already put in `summary`, and the card would render the same
     * paragraph twice.
     */
    async show(request, response) {
        try {
            const { paheId } = animePaheIdParamSchema.parse(request.params)

            const [found] = await this.anime.findByPaheIds([paheId])
            if (!found) {
                return response.status(404).json({ success: false, message: 'Anime not found' })
            }

            response
                .status(200)
                .json({ success: true, anime: mapAnimeDetail(found, { synopsis: null }) })
        } catch (error) {
            responseError(response, error)
        }
    }
}

export default AnimeController
