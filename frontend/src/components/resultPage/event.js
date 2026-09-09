import styles from './component.module.css'
import AnimeCard from './card/main'
import { useState } from '@/core/useState'
import { recommendations, subscribeRecommendations } from '@/store/counter'
import { fetchAnimeRelations } from '@/api/anime'

const [index, setIndex, subscribeIndex] = useState(0)

export { setIndex }

let lastDirection = 1

// Trailer state is page-local (not in the shared store) - it's purely a
// per-view UI toggle, reset back to the poster whenever the visible anime
// changes so the trailer never lingers onto the next card.
const [showTrailer, setShowTrailer, subscribeShowTrailer] = useState(false)

// Same idea for the Summary/Relations tab - resets to 'summary' on every
// navigation. relationsCache is a plain Map (not store state) keyed by
// anime id, so flipping back to a card whose relations you already opened
// doesn't refetch - it's just a memoization layer, nothing subscribes to it
// directly, render() is called manually after each fetch settles.
const [activeTab, setActiveTab, subscribeActiveTab] = useState('summary')
const relationsCache = new Map()

// Swipe gesture thresholds, in pixels. Below MIN_DISTANCE it's treated as a
// tap/scroll, not a swipe. Requiring horizontal to dominate vertical avoids
// hijacking a vertical scroll inside .animeCardInfo/.animeCardBody as a
// navigation swipe.
const SWIPE_MIN_DISTANCE = 50
let touchStartX = 0
let touchStartY = 0

// Explicitly set by whichever action should play the slide-in entrance
// (navigate/goTo/a fresh recommendations batch), then consumed and cleared
// inside render(). Tab clicks and the trailer toggle also call render() but
// deliberately never set this, so they don't replay the animation.
let animateNextRender = false

export default function Events() {
    try {
        function navigate(direction) {
            const total = recommendations().length
            if (total <= 1) return

            lastDirection = direction
            animateNextRender = true
            setShowTrailer(false)
            setActiveTab('summary')

            setIndex((prev) => {
                const next = prev + direction
                if (next < 0) return total - 1
                if (next >= total) return 0
                return next
            })
        }

        function goTo(targetIndex) {
            if (targetIndex === index()) return

            lastDirection = targetIndex > index() ? 1 : -1
            animateNextRender = true
            setShowTrailer(false)
            setActiveTab('summary')
            setIndex(targetIndex)
        }

        async function loadRelations(animeId) {
            if (relationsCache.has(animeId)) return

            relationsCache.set(animeId, { status: 'loading', groups: [] })
            render()

            try {
                const groups = await fetchAnimeRelations(animeId)
                relationsCache.set(animeId, { status: 'loaded', groups })
            } catch (error) {
                console.log('Failed to load relations:', error)
                relationsCache.set(animeId, { status: 'error', groups: [] })
            }

            render()
        }

        function renderEmpty() {
            document.querySelector('#result-content').innerHTML = `
                <div class='${styles.empty}'>
                    <p class='${styles.emptyText}'>
                        NO MORE RECOMMENDATIONS
                    </p>
                    <a class='${styles.emptyLink}' href='/'>
                        START OVER
                    </a>
                </div>
            `
        }

        function render() {
            const list = recommendations()
            const total = list.length

            if (total === 0) {
                renderEmpty()
                return
            }

            const currentIndex = Math.min(index(), total - 1)
            const anime = list[currentIndex]
            const animateClass = animateNextRender ? styles.animate : ''
            animateNextRender = false
            const directionClass = lastDirection === -1 ? styles.slideInLeft : ''
            const relationsState = relationsCache.get(anime.id) ?? { status: 'idle', groups: [] }

            document.querySelector('#result-content').innerHTML = `
                <div class='${styles.header}'>
                    <span class='${styles.headerLabel}'>
                        YOUR RECOMMENDATIONS
                    </span>

                    <span class='${styles.headerCount}'>
                        ${String(currentIndex + 1).padStart(2, '0')}
                        <span class='${styles.headerCountMuted}'>
                            / ${String(total).padStart(2, '0')}
                        </span>
                    </span>
                </div>

                <div class='${styles.content}'>
                    <div class='${styles.animeCardWrapper} ${animateClass} ${directionClass}' style='max-height:${showTrailer() ? '100%' : '734px'}'>
                        ${AnimeCard(anime, currentIndex, total, showTrailer(), activeTab(), relationsState)}
                    </div>

                    <div class='${styles.navigation}'>
                        <button
                            class='${styles.navButton} ${styles.prevButton}'
                            ${total <= 1 ? 'disabled' : ''}
                            data-action='prev'
                        >
                            PREV
                        </button>

                        <div class='${styles.recommendations}'>
                            ${list
                                .map(
                                    (_, i) => `
                                <button
                                    class='${styles.recommendationButton} ${i === currentIndex ? styles.active : ''}'
                                    data-index='${i}'
                                    aria-label='Go to recommendation ${i + 1}'
                                ></button>
                            `,
                                )
                                .join('')}
                        </div>

                        <button
                            class='${styles.navButton} ${styles.nextButton}'
                            ${total <= 1 ? 'disabled' : ''}
                            data-action='next'
                        >
                            NEXT
                        </button>
                    </div>

                    <div class='${styles.viewAll}'>
                        <a class='${styles.viewAllLink}' data-action='viewAll' href='/summary'>
                            VIEW ALL ${total} RECOMMENDATIONS
                        </a>
                    </div>
                </div>
            `
            document
                .querySelector('[data-action="prev"]')
                .addEventListener('click', () => navigate(-1))
            document
                .querySelector('[data-action="next"]')
                .addEventListener('click', () => navigate(1))

            document
                .querySelector('[data-action="toggle-trailer"]')
                ?.addEventListener('click', () => setShowTrailer((prev) => !prev))

            document.querySelectorAll('[data-index]').forEach((button) => {
                button.addEventListener('click', () => goTo(Number(button.dataset.index)))
            })

            document.querySelectorAll('[data-tab]').forEach((button) => {
                button.addEventListener('click', () => {
                    const tab = button.dataset.tab
                    setActiveTab(tab)
                    if (tab === 'relations') loadRelations(anime.id)
                })
            })

            // Swipe navigation for mobile - kept as a plain addEventListener pair
            // rather than a library, since we only need a simple horizontal-swipe
            // check. Re-attached every render() since innerHTML fully replaces
            // the DOM each time, same as every other listener in this file.
            const wrapperEl = document.querySelector(`.${styles.animeCardWrapper}`)

            wrapperEl.addEventListener(
                'touchstart',
                (event) => {
                    touchStartX = event.touches[0].clientX
                    touchStartY = event.touches[0].clientY
                },
                { passive: true },
            )

            wrapperEl.addEventListener(
                'touchend',
                (event) => {
                    const deltaX = event.changedTouches[0].clientX - touchStartX
                    const deltaY = event.changedTouches[0].clientY - touchStartY

                    if (
                        Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
                        Math.abs(deltaX) < Math.abs(deltaY)
                    ) {
                        return
                    }

                    navigate(deltaX < 0 ? 1 : -1)
                },
                { passive: true },
            )
        }

        render()

        const unsubscribeRecommendations = subscribeRecommendations(() => {
            lastDirection = 1
            animateNextRender = true
            setShowTrailer(false)
            setActiveTab('summary')
            setIndex(0)
            render()
        })
        const unsubscribeIndex = subscribeIndex(render)
        const unsubscribeShowTrailer = subscribeShowTrailer(render)
        const unsubscribeActiveTab = subscribeActiveTab(render)

        return () => {
            unsubscribeRecommendations()
            unsubscribeIndex()
            unsubscribeShowTrailer()
            unsubscribeActiveTab()
        }
    } catch (error) {
        console.log('Result Page Event:', error)
    }
}
