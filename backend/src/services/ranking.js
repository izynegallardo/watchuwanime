const SIMILARITY_WEIGHT = 0.6

export const RANK_FACTORS = {
    duration: {
        weight: 0.2,
        score: (match, { timeAvailable }) => {
            if (!match.total_minutes) return 0.5
            return 1 / (1 + Math.abs(Math.log(match.total_minutes / timeAvailable)))
        },
    },
    quality: {
        weight: 0.1,
        score: (match) => {
            const scoreFit = match.score ? Math.min(match.score / 10, 1) : 0.5
            const popularityFit = match.popularity ? 1 / (1 + Math.log10(match.popularity)) : 0.5
            return (scoreFit + popularityFit) / 2
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
