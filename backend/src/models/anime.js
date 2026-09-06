function parseEmbedding(raw) {
    if (Array.isArray(raw)) return raw
    return JSON.parse(raw)
}

function toVectorLiteral(embedding) {
    return `[${embedding.join(',')}]`
}

// .env.local has no DATABASE_URL (no cloud project for local dev), so
// that's the signal to route through pg -> local Postgres instead of
// supabase-js -> PostgREST -> Supabase Postgres.
function isLocalTarget() {
    return !process.env.DATABASE_URL
}

class Anime {
    constructor() {
        this.isLocal = isLocalTarget()
    }

    /**
     * Bulk insert, used only by ingestion. Routes to whichever database is
     * configured for the active env file - see isLocalTarget() above.
     */
    async create(records) {
        return this.isLocal ? this.#createLocal(records) : this.#createRemote(records)
    }

    async #createRemote(records) {
        try {
            const { supabase } = await import('../core/supabase.js')
            const results = await supabase
                .from('anime')
                .upsert(records, { onConflict: 'pahe_id' })
                .select()

            if (results.error)
                throw new Error(`Failed to insert embeddings: ${JSON.stringify(results.error)}`)

            return results.data
        } catch (error) {
            console.error('<error> anime.create (remote)', error)
            throw error
        }
    }

    async #createLocal(records) {
        try {
            const { pool } = await import('../core/database.js')
            const inserted = []

            for (const record of records) {
                const result = await pool.query(
                    `
                        insert into anime (
                            pahe_id, title, title_romaji, title_japanese, title_spanish, title_french,
                            synonyms, type, aired_from, aired_to, season, genres, themes, demographics,
                            studios, summary, status, is_airing, image_url, youtube_url, external_links,
                            relations, recommendations, duration_minutes, episodes, content, embedding
                        ) values (
                            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                            $21,$22,$23,$24,$25,$26,$27
                        )
                        on conflict (pahe_id) do update set
                            title = excluded.title,
                            title_romaji = excluded.title_romaji,
                            title_japanese = excluded.title_japanese,
                            title_spanish = excluded.title_spanish,
                            title_french = excluded.title_french,
                            synonyms = excluded.synonyms,
                            type = excluded.type,
                            aired_from = excluded.aired_from,
                            aired_to = excluded.aired_to,
                            season = excluded.season,
                            genres = excluded.genres,
                            themes = excluded.themes,
                            demographics = excluded.demographics,
                            studios = excluded.studios,
                            summary = excluded.summary,
                            status = excluded.status,
                            is_airing = excluded.is_airing,
                            image_url = excluded.image_url,
                            youtube_url = excluded.youtube_url,
                            external_links = excluded.external_links,
                            relations = excluded.relations,
                            recommendations = excluded.recommendations,
                            duration_minutes = excluded.duration_minutes,
                            episodes = excluded.episodes,
                            content = excluded.content,
                            embedding = excluded.embedding
                        returning *
                    `,
                    [
                        record.pahe_id,
                        record.title,
                        record.title_romaji,
                        record.title_japanese,
                        record.title_spanish,
                        record.title_french,
                        record.synonyms,
                        record.type,
                        record.aired_from,
                        record.aired_to,
                        record.season,
                        record.genres,
                        record.themes,
                        record.demographics,
                        record.studios,
                        record.summary,
                        record.status,
                        record.is_airing,
                        record.image_url,
                        record.youtube_url,
                        record.external_links ? JSON.stringify(record.external_links) : null,
                        record.relations ? JSON.stringify(record.relations) : null,
                        record.recommendations ? JSON.stringify(record.recommendations) : null,
                        record.duration_minutes,
                        record.episodes,
                        record.content,
                        toVectorLiteral(record.embedding),
                    ],
                )

                inserted.push(result.rows[0])
            }

            return inserted
        } catch (error) {
            console.error('<error> anime.create (local)', error)
            throw error
        }
    }

    /**
     * Calls supabase.rpc - always remote, nothing currently calls this against
     * a local target.
     */
    async search(
        embedding,
        { matchThreshold = 0.3, matchCount = 10, excludeIds = [], excludeGenres = [] } = {},
    ) {
        try {
            const { supabase } = await import('../core/supabase.js')
            const results = await supabase.rpc('match_anime', {
                query_embedding: embedding,
                match_threshold: matchThreshold,
                match_count: matchCount,
                exclude_ids: excludeIds,
                exclude_genres: excludeGenres,
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

    /**
     * Looks up anime by pahe_id, used only as the last-resort backfill when
     * vector search + threshold relaxing still can't fill RESULT_COUNT - pulls
     * candidates referenced in already-matched anime's relations/recommendations.
     * No embedding needed here, these rows aren't reranked, just appended.
     */
    async findByPaheIds(paheIds) {
        if (!paheIds.length) return []

        try {
            if (this.isLocal) {
                const { pool } = await import('../core/database.js')
                const result = await pool.query('select * from anime where pahe_id = any($1)', [
                    paheIds,
                ])
                return result.rows
            }

            const { supabase } = await import('../core/supabase.js')
            const results = await supabase.from('anime').select('*').in('pahe_id', paheIds)

            if (results.error)
                throw new Error(`Failed to find anime by pahe_id: ${JSON.stringify(results.error)}`)

            return results.data
        } catch (error) {
            console.error('<error> anime.findByPaheIds', error)
            throw error
        }
    }
}

export default Anime
