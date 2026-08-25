import styles from './component.module.css'
import { recommendations } from '@/store/counter'

export default function Events() {
    try {
        function renderTable() {
            document.querySelector('#table-container').innerHTML = `
                <table class='${styles.table}'>
                    <thead>
                        <tr class='${styles.tableHeaderRow}'>
                            <th class='${styles.tableHeader}'>#</th>
                            <th class='${styles.tableHeader}'>TITLE</th>
                            <th class='${styles.tableHeader}'>YEAR</th>
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
                                            ${anime.year}
                                        </td>

                                        <td class='${styles.metaCell}'>
                                            ${anime.episodeCount === 1 ? 'FILM' : `${anime.episodeCount} EPS`}
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
        }

        function renderActions() {
            document.querySelector('#actions-container').innerHTML = `
                <a class='${styles.tryAgainLink}' href='/'>
                    ← TRY AGAIN
                </a>

                ${
                    canMore
                        ? `
                    <button class='${styles.moreButton}'>
                        MORE RECOMMENDATIONS →
                    </button>
                `
                        : ''
                }
            
            `
        }

        renderTable()
        renderActions()
    } catch (error) {
        console.error('Summary Page event:', error)
    }
}
