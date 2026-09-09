import styles from './component.module.css'
import AnimeCard from '@/components/resultPage/card/main'
import { useState } from '@/core/useState'
import { fetchAnimeByPaheId, fetchAnimeRelations } from '@/api/anime'

// Module-level (not inside Events()) so these survive across visits: leaving
// an anime page and coming back to the SAME pahe_id reuses what's already
// fetched instead of hitting the API again. Keyed by pahe_id (animeCache) and
// by internal id (relationsCache, matching resultPage's convention) since
// relations are only ever looked up once we already have the anime's id.
const animeCache = new Map()
const relationsCache = new Map()

export default function Events(params) {
    try {
        const paheId = params?.paheId

        // Trailer/tab state IS reset per visit though - unlike the data
        // above, there's no reason a previously-open trailer or Relations
        // tab should still be showing just because the underlying anime
        // data came from cache.
        const [showTrailer, setShowTrailer, subscribeShowTrailer] = useState(false)
        const [activeTab, setActiveTab, subscribeActiveTab] = useState('summary')

        let anime = paheId ? (animeCache.get(paheId) ?? null) : null
        // 'loading' | 'loaded' | 'not-found' | 'error'
        let status = anime ? 'loaded' : paheId ? 'loading' : 'not-found'

        async function load() {
            try {
                anime = await fetchAnimeByPaheId(paheId)
                animeCache.set(paheId, anime)
                status = 'loaded'
            } catch (error) {
                console.log('Failed to load anime:', error)
                status = error?.response?.status === 404 ? 'not-found' : 'error'
            }
            render()
        }

        async function loadRelations() {
            if (!anime || relationsCache.has(anime.id)) return

            relationsCache.set(anime.id, { status: 'loading', groups: [] })
            render()

            try {
                const groups = await fetchAnimeRelations(anime.id)
                relationsCache.set(anime.id, { status: 'loaded', groups })
            } catch (error) {
                console.log('Failed to load relations:', error)
                relationsCache.set(anime.id, { status: 'error', groups: [] })
            }

            render()
        }

        function renderStatus(message) {
            document.getElementById('main').innerHTML = `
                <div class='${styles.status}'>
                    <p class='${styles.statusText}'>${message}</p>
                    <a class='${styles.statusLink}' href='/'>BACK HOME</a>
                </div>
            `
        }

        function render() {
            if (status === 'loading') {
                document.getElementById('main').innerHTML = `
                    <div class='${styles.status}'>
                        <p class='${styles.statusText}'>LOADING...</p>
                    </div>
                `
                return
            }

            if (status === 'not-found') {
                renderStatus('ANIME NOT FOUND')
                return
            }

            if (status === 'error') {
                renderStatus('SOMETHING WENT WRONG')
                return
            }

            const relationsState = relationsCache.get(anime.id) ?? { status: 'idle', groups: [] }

            document.getElementById('main').innerHTML = `
                <div class='${styles.content}'>
                    <div class='${styles.animeCardWrapper}' style='max-height:${showTrailer() ? '100%' : '734px'}'>
                        ${AnimeCard(anime, 0, 1, showTrailer(), activeTab(), relationsState)}
                    </div>
                </div>
            `

            document
                .querySelector('[data-action="toggle-trailer"]')
                ?.addEventListener('click', () => setShowTrailer((prev) => !prev))

            document.querySelectorAll('[data-tab]').forEach((button) => {
                button.addEventListener('click', () => {
                    const tab = button.dataset.tab
                    setActiveTab(tab)
                    if (tab === 'relations') loadRelations()
                })
            })
        }

        render()

        if (paheId && !anime) load()

        const unsubscribeShowTrailer = subscribeShowTrailer(render)
        const unsubscribeActiveTab = subscribeActiveTab(render)

        return () => {
            unsubscribeShowTrailer()
            unsubscribeActiveTab()
        }
    } catch (error) {
        console.log('Anime Page Event:', error)
    }
}
