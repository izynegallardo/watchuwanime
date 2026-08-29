import styles from './component.module.css'
import {
    timeIndex,
    recommendations,
    setRecommendations,
    shownIds,
    setShownIds,
    sessionAnswers,
    setSessionAnswers,
} from '@/store/counter'
import { TIME_STEPS } from '@/data/time'
import { fetchRecommendations } from '@/api/anime'
import { setIndex as setCarouselIndex } from '@/components/resultPage/event'

const MAX_SHOWN = 30

export default function Events() {
    try {
        function canMore() {
            return shownIds().length < MAX_SHOWN
        }

        function renderTable() {
            document.querySelector('#table-container').innerHTML = `
                <table class='${styles.table}'>
                    <thead>
                        <tr class='${styles.tableHeaderRow}'>
                            <th class='${styles.tableHeader}'>#</th>
                            <th class='${styles.tableHeader}'>TITLE</th>
                            <th class='${styles.tableHeader}'>STATUS</th>
                            <th class='${styles.tableHeader}'>TYPE</th>
                            <th class='${styles.tableHeader}'>GENRES</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${recommendations()
                            .map((anime, i) => {
                                const isEven = i % 2 === 0

                                return `
                                    <tr
                                        class='${styles.tableRow} ${isEven ? styles.evenRow : styles.oddRow}'
                                        data-index='${i}'
                                    >
                                        <td class='${styles.indexCell}'>
                                            ${String(i + 1).padStart(2, '0')}
                                        </td>

                                        <td class='${styles.titleCell}'>
                                            ${anime.title}
                                        </td>

                                        <td class='${styles.metaCell}'>
                                            ${anime.status}
                                        </td>

                                        <td class='${styles.metaCell}'>
                                            ${anime.type.toUpperCase()}
                                        </td>

                                        <td class='${styles.genresCell}'>
                                            <div class='${styles.genreList}'>
                                                ${anime.genres
                                                    .map(
                                                        (genre) => `
                                                    <span class='${styles.genre}'>
                                                        ${genre}
                                                    </span>
                                                `,
                                                    )
                                                    .join('')}
                                            </div>
                                        </td>
                                    </tr>
                                `
                            })
                            .join('')}
                    </tbody>
                </table>
            `

            document.querySelectorAll('[data-index]').forEach((row) => {
                row.addEventListener('click', () => {
                    setCarouselIndex(Number(row.dataset.index))
                    window.app.pushRoute('/results')
                })
            })
        }

        function renderActions() {
            document.querySelector('#actions-container').innerHTML = `
                <a class='${styles.tryAgainLink}' href='/'>
                    ← TRY AGAIN
                </a>

                ${
                    canMore()
                        ? `
                            <button id='more-button' class='${styles.moreButton}'>
                                MORE RECOMMENDATIONS →
                            </button>
                        `
                        : ''
                }
            `

            const moreButton = document.querySelector('#more-button')
            if (moreButton) {
                moreButton.addEventListener('click', handleMore)
            }
        }

        let isFetchingMore = false

        function handleMore() {
            if (isFetchingMore) return
            isFetchingMore = true

            const moreButton = document.querySelector('#more-button')
            moreButton.disabled = true
            moreButton.textContent = 'LOADING...'

            fetchRecommendations(sessionAnswers(), TIME_STEPS[timeIndex()], shownIds())
                .then((data) => {
                    setRecommendations(data)
                    setShownIds((prev) => [...prev, ...data.map((anime) => anime.id)])
                    window.app.pushRoute('/results')
                })
                .catch((error) => {
                    console.error('Failed to fetch more recommendations:', error)
                    isFetchingMore = false
                    moreButton.disabled = false
                    moreButton.textContent = 'MORE RECOMMENDATIONS →'
                })
        }

        renderTable()
        renderActions()
    } catch (error) {
        console.error('Summary Page event:', error)
    }
}
