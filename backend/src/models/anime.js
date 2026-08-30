import { supabase } from '../core/supabase.js'

function parseEmbedding(raw) {
    if (Array.isArray(raw)) return raw
    return JSON.parse(raw)
}

class Anime {
    constructor() {
        this.client = supabase
    }

    /**
     * Bulk insert, used only by ingestion
     */
    async create(records) {
        try {
            const results = await this.client
                .from('anime')
                .upsert(records, { onConflict: 'mal_id' })
                .select()

            if (results.error)
                throw new Error(`Failed to insert embeddings: ${JSON.stringify(results.error)}`)

            return results.data
        } catch (error) {
            console.error('<error> anime.create', error)
            throw error
        }
    }

    /**
     * Calls supabase.rpc
     */
    async search(embedding, { matchThreshold = 0.3, matchCount = 10, excludeIds = [] } = {}) {
        try {
            const results = await this.client.rpc('match_anime', {
                query_embedding: embedding,
                match_threshold: matchThreshold,
                match_count: matchCount,
                exclude_ids: excludeIds,
            })

            if (results.error)
                throw new Error(`Failed to match anime: ${JSON.stringify(results.error)}`)

            return results.data.map((row) => ({
                ...row,
                embedding: parseEmbedding(row.embedding),
            }))
        } catch (error) {
            console.error('<error> anime.search', error)
            throw error
        }
    }
}

export default Anime
