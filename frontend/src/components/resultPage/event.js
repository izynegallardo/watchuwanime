import styles from './component.module.css'
import AnimeCard from './card/main'
import { useState } from '@/core/useState'
import { recommendations, subscribeRecommendations } from '@/store/counter'

const [index, setIndex, subscribeIndex] = useState(0)

export { setIndex }

let lastDirection = 1

// Trailer state is page-local (not in the shared store) - it's purely a
// per-view UI toggle, reset back to the poster whenever the visible anime
// changes so the trailer never lingers onto the next card.
const [showTrailer, setShowTrailer, subscribeShowTrailer] = useState(false)

export default function Events() {
    try {
        function navigate(direction) {
            const total = recommendations().length
            if (total <= 1) return

            lastDirection = direction
            setShowTrailer(false)

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
            setShowTrailer(false)
            setIndex(targetIndex)
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
            const directionClass = lastDirection === -1 ? styles.slideInLeft : ''

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
                    <div class='${styles.animeCardWrapper} ${directionClass}'>
                        ${AnimeCard(anime, currentIndex, total, showTrailer())}
                    </div>

                    <div class='${styles.navigation}'>
                        <button
                            class='${styles.navButton} ${styles.prevButton}'
                            ${total <= 1 ? 'disabled' : ''}
                            data-action='prev'
                        >
                            ← PREV
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
                            NEXT →
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
        }

        render()

        const unsubscribeRecommendations = subscribeRecommendations(() => {
            lastDirection = 1
            setShowTrailer(false)
            setIndex(0)
            render()
        })
        const unsubscribeIndex = subscribeIndex(render)
        const unsubscribeShowTrailer = subscribeShowTrailer(render)

        return () => {
            unsubscribeRecommendations()
            unsubscribeIndex()
            unsubscribeShowTrailer()
        }
    } catch (error) {
        console.log('Result Page Event:', error)
    }
}
