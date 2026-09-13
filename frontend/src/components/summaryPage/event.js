import styles from './component.module.css'
import {
    timeIndex,
    allowMatureGenres,
    allowedSideStoryTypes,
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
import { syncSaveButtons } from '@/components/resultPage/card/main'
import { isSaved, toggleSaved } from '@/utils/saved'
import { subscribeSavedIds, syncSavedIds } from '@/store/saved'
import BookMarkIcon from '@/assets/bookmark.svg'
import UnBookMarkIcon from '@/assets/unbookmark.svg'
import LoadingScreen from '@/components/loadingScreen/main'
import LoadingScreenEvents from '@/components/loadingScreen/event'
import Main from './main'

export default function Events() {
    try {
        function renderTable() {
            document.querySelector('#table-container').innerHTML = `
                <table class='${styles.table}'>
                    <thead>
                        <tr class='${styles.tableHeaderRow}'>
                            <th class='${styles.tableHeader}'>#</th>
                            <th class='${styles.tableHeader}'>TITLE</th>
                            <th class='${styles.tableHeader}'>DURATION</th>
                            <th class='${styles.tableHeader}'>SEASON</th>
                            <th class='${styles.tableHeader}'>TYPE</th>
                            <th class='${styles.tableHeader}'>GENRES</th>
                            <th class='${styles.tableHeader}'></th>
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
                                            ${anime.totalMinutes + ' mins' || 'Unknown'} 
                                        </td>

                                        <td class='${styles.metaCell}'>
                                            ${anime.season}
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

                                        <td class='${styles.saveCell}'>
                                            <button
                                                class='${styles.saveButton}'
                                                type='button'
                                                data-action='toggle-save'
                                                data-pahe-id='${anime.paheId}'
                                                aria-label='${isSaved(anime.paheId) ? 'Remove from saved' : 'Save anime'}'
                                                aria-pressed='${isSaved(anime.paheId)}'
                                                title='${isSaved(anime.paheId) ? 'Remove from library' : 'Add to library'}'
                                            >
                                                <img
                                                    class='${styles.saveIcon}'
                                                    src="${isSaved(anime.paheId) ? BookMarkIcon : UnBookMarkIcon}"
                                                    alt='Bookmark Icon'
                                                />
                                            </button>
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

            // Stops the row's own click (which navigates) from also firing -
            // toggleSaved()+syncSavedIds() matches the pattern in resultPage/
            // animePage: write to localStorage, notify the store, and let
            // subscribeSavedIds(syncSaveButtons) below patch this button's
            // icon/aria state rather than doing it inline here.
            document.querySelectorAll('[data-action="toggle-save"]').forEach((button) => {
                button.addEventListener('click', (event) => {
                    event.stopPropagation()
                    toggleSaved(button.dataset.paheId)
                    syncSavedIds()
                })
            })
        }

        function renderActions() {
            document.querySelector('#actions-container').innerHTML = `
                <a class='${styles.tryAgainLink}' href='/'>
                    ← TRY AGAIN
                </a>

                <button id='more-button' class='${styles.moreButton}' type='button'>
                    MORE RECOMMENDATIONS →
                </button>
                `

            document.querySelector('#more-button').addEventListener('click', handleMore)
        }

        let stopLoadingScreen = null

        function showLoadingScreen() {
            const root = document.querySelector('#main')
            LoadingScreen(root)
            stopLoadingScreen = LoadingScreenEvents(root)
        }

        function restorePage() {
            Main(document.querySelector('#main'))
            renderTable()
            renderActions()
        }

        let isFetchingMore = false

        function handleMore() {
            if (isFetchingMore) return

            isFetchingMore = true

            showLoadingScreen()

            fetchRecommendations(
                sessionAnswers(),
                TIME_STEPS[timeIndex()],
                shownIds(),
                allowMatureGenres(),
                allowedSideStoryTypes(),
            )
                .then((data) => {
                    stopLoadingScreen?.()

                    setRecommendations(data)
                    setShownIds((prev) => [...prev, ...data.map((anime) => anime.id)])
                    window.app.pushRoute('/results')
                })
                .catch((error) => {
                    stopLoadingScreen?.()

                    console.error('Failed to fetch more recommendations:', error)

                    isFetchingMore = false
                    restorePage()
                })
        }

        renderTable()
        renderActions()

        const unsubscribeSavedIds = subscribeSavedIds(syncSaveButtons)

        return () => {
            unsubscribeSavedIds()
        }
    } catch (error) {
        console.error('Summary Page event:', error)
    }
}
