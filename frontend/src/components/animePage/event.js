import styles from './component.module.css'
import AnimeCard, { syncSaveButtons } from '@/components/resultPage/card/main'
import { useState } from '@/core/useState'
import { fetchAnimeByPaheId, fetchAnimeRelations } from '@/api/anime'
import { peek } from '@/core/cache'
import { toggleSaved } from '@/utils/saved'
import { subscribeSavedIds, syncSavedIds } from '@/store/saved'

// Module-level (not inside Events()) so this survives across visits: leaving
// a relations tab open and coming back reuses what's already fetched. Keyed
// by pahe_id (not the internal id - keeping ids out of the URL/cache avoids
// making them enumerable), matching resultPage's convention. The anime data
// itself no longer needs its own Map here - fetchAnimeByPaheId is cached
// session-wide in core/cache.js, shared with resultPage and the Saved page.
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

        // peek() reads the shared session cache synchronously so a revisit
        // to an already-fetched paheId renders instantly instead of
        // flashing 'LOADING...' for one tick while query() resolves.
        let anime = paheId ? (peek(`anime:${paheId}`) ?? null) : null
        // 'loading' | 'loaded' | 'not-found' | 'error'
        let status = anime ? 'loaded' : paheId ? 'loading' : 'not-found'

        async function load() {
            try {
                anime = await fetchAnimeByPaheId(paheId)
                status = 'loaded'
            } catch (error) {
                console.log('Failed to load anime:', error)
                status = error?.response?.status === 404 ? 'not-found' : 'error'
            }
            render()
        }

        async function loadRelations() {
            if (!anime || relationsCache.has(anime.paheId)) return

            relationsCache.set(anime.paheId, { status: 'loading', groups: [] })
            render()

            try {
                const groups = await fetchAnimeRelations(anime.paheId)
                relationsCache.set(anime.paheId, { status: 'loaded', groups })
            } catch (error) {
                console.log('Failed to load relations:', error)
                relationsCache.set(anime.paheId, { status: 'error', groups: [] })
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

            const relationsState = relationsCache.get(anime.paheId) ?? {
                status: 'idle',
                groups: [],
            }

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

            // See resultPage/event.js for why this pushes into the shared
            // store (syncSavedIds) instead of patching this button's DOM
            // directly - subscribeSavedIds(syncSaveButtons) below does that.
            document.querySelector('[data-action="toggle-save"]')?.addEventListener('click', (event) => {
                toggleSaved(event.currentTarget.dataset.paheId)
                syncSavedIds()
            })

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
        const unsubscribeSavedIds = subscribeSavedIds(syncSaveButtons)

        return () => {
            unsubscribeShowTrailer()
            unsubscribeActiveTab()
            unsubscribeSavedIds()
        }
    } catch (error) {
        console.log('Anime Page Event:', error)
    }
}
