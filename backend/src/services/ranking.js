const SIMILARITY_WEIGHT = 0.6

// Below this, judging fit by total series runtime would wrongly exclude
// nearly everything - 25 min is the shortest selectable session
// (TIME_STEPS[0] in the frontend), and almost no multi-episode series has a
// total runtime that short. So a "quick episode" session falls back to
// per-episode length (duration_minutes) instead. Above this threshold,
// total_minutes is the primary metric, so a real time budget ("I have 2
// hours") surfaces anime that can actually be finished in that sitting,
// not just anime whose first episode happens to fit.
export const SHORT_SESSION_MINUTES = 25

export const RANK_FACTORS = {
    duration: {
        weight: 0.3,
        score: (match, { timeAvailable }) => {
            const useEpisodeLength = timeAvailable <= SHORT_SESSION_MINUTES
            const minutes = useEpisodeLength ? match.duration_minutes : match.total_minutes

            if (!minutes) return 0.5
            return 1 / (1 + Math.abs(Math.log(minutes / timeAvailable)))
        },
    },
    status: {
        weight: 0.1,
        score: (match) => {
            if (match.status === 'Finished Airing') return 1
            if (match.status === 'Currently Airing') return 0.7
            return 0.3
        },
    },
}

/**
 * Reranks matches by blending raw similarity with whichever factors are
 * enabled. Only orders the list, callers decide how many results to keep.
 *
 * @param {object[]} candidates - rows returned from Anime.search()
 * @param {object} context - values factor scorers need (e.g. timeAvailable)
 * @param {string[]} enabledFactorKeys - which RANK_FACTORS keys to apply.
 *
 * Pass an empty array to rank by pure similarity only.
 */
export function rankByFit(candidates, context = {}, enabledFactorKeys = []) {
    const activeFactors = enabledFactorKeys.map((key) => RANK_FACTORS[key]).filter(Boolean)

    if (!activeFactors.length) {
        return [...candidates].sort((a, b) => b.similarity - a.similarity)
    }

    const factorWeightTotal = activeFactors.reduce((sum, factor) => sum + factor.weight, 0)
    const totalWeight = SIMILARITY_WEIGHT + factorWeightTotal

    return candidates
        .map((match) => {
            const factorScore = activeFactors.reduce(
                (sum, factor) => sum + factor.score(match, context) * factor.weight,
                0,
            )

            const fitScore = (match.similarity * SIMILARITY_WEIGHT + factorScore) / totalWeight

            return { ...match, fitScore }
        })
        .sort((a, b) => b.fitScore - a.fitScore)
}

/**
 * Walks a fitScore-ranked list top to bottom, keeping only the
 * highest-ranked anime from each franchise cluster. Whenever a candidate is
 * kept, every pahe_id listed in its own `relations` (sequels, prequels,
 * side stories, etc.) is marked so later occurrences of it get deferred
 * instead of crowding the top results - e.g. searching "attack on titan"
 * shouldn't return the same franchise 10 times over.
 *
 * Deferred entries aren't discarded: the caller backfills from `deferred`
 * if `primary` alone can't reach RESULT_COUNT, so a franchise repeat is
 * still preferable to returning fewer than the guaranteed count.
 *
 * @param {object[]} rankedCandidates - output of rankByFit, each needs `pahe_id` and `relations`
 */
export function dedupeByRelations(rankedCandidates) {
    const primary = []
    const deferred = []
    const relatedIds = new Set()

    for (const candidate of rankedCandidates) {
        if (relatedIds.has(candidate.pahe_id)) {
            deferred.push(candidate)
            continue
        }

        primary.push(candidate)
        for (const rel of candidate.relations ?? []) {
            relatedIds.add(rel.pahe_id)
        }
    }

    return { primary, deferred }
}

/**
 * Guards against the RAG "self-reference" problem: if the person's answer
 * names an anime directly (e.g. "Made in Abyss has an incredible sense of
 * mystery..."), that anime's own title appears almost verbatim in both the
 * query and its own embedded content, so it tends to rank #1 on pure
 * similarity - even though handing back the exact anime they just
 * described isn't a recommendation. Titles under 4 characters are skipped
 * to avoid false-positive exclusions on short/common words.
 *
 * @param {object[]} candidates - each needs `title`, optionally `title_romaji`/`synonyms`
 * @param {string} queryText - the raw, un-embedded answer text
 */
export function excludeSelfReferencedTitles(candidates, queryText) {
    const normalizedQuery = queryText.toLowerCase()

    return candidates.filter((candidate) => {
        const titles = [candidate.title, candidate.title_romaji, ...(candidate.synonyms ?? [])]

        const isSelfReferenced = titles.some(
            (title) => title && title.length >= 4 && normalizedQuery.includes(title.toLowerCase()),
        )

        return !isSelfReferenced
    })
}

const MMR_LAMBDA = 0.7 // 1 = pure relevance, 0 = pure diversity

function cosineSimilarity(a, b) {
    let dot = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Greedily selects `count` results balancing relevance (fitScore, falling
 * back to raw similarity) against redundancy with results already picked.
 * This is what keeps near-duplicate matches (sequels, specials, or anything
 * the user named directly, which retrieval will otherwise rank very high
 * again and again) from crowding out variety in the final list.
 *
 * @param {object[]} rankedCandidates - output of rankByFit, each needs an `embedding` array
 * @param {number} count - how many results to select
 * @param {number} lambda - relevance vs diversity tradeoff, see MMR_LAMBDA
 */
export function mmrRerank(rankedCandidates, count, lambda = MMR_LAMBDA) {
    const pool = [...rankedCandidates]
    const selected = []

    while (pool.length && selected.length < count) {
        let bestIndex = 0
        let bestScore = -Infinity

        pool.forEach((candidate, index) => {
            const relevance = candidate.fitScore ?? candidate.similarity
            const maxSimilarityToSelected = selected.length
                ? Math.max(...selected.map((s) => cosineSimilarity(candidate.embedding, s.embedding)))
                : 0

            const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarityToSelected

            if (mmrScore > bestScore) {
                bestScore = mmrScore
                bestIndex = index
            }
        })

        selected.push(pool[bestIndex])
        pool.splice(bestIndex, 1)
    }

    return selected
}
