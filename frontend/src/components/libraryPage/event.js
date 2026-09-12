import styles from './component.module.css'
import { getSavedEntries, toggleSaved } from '@/utils/saved'
import { subscribeSavedIds, syncSavedIds } from '@/store/saved'
import { fetchAnimeByPaheId } from '@/api/anime'
import { normalizeHTML, normalizeRelativeDate } from '@/utils/normalize'
import TrashIcon from '@/assets/trash.svg'
import LibraryIcon from '@/assets/library1.svg'
import { confirmDestructive } from '@/utils/confirmDialog'

export default function Events() {
    try {
        function renderIntro(subtitle) {
            return `
                <div class='${styles.top}'>
                    <img src="${LibraryIcon}" class='${styles.libraryIcon}' alt='Library Icon'>
                    <div class='${styles.intro}'>
                        <span class='${styles.label}'>LIBRARY</span>
                        <h1 class='${styles.title}'>SAVED ANIME</h1>
                        <p class='${styles.description}'>${subtitle}</p>
                    </div>
                </div>
            `
        }

        function renderLoading() {
            document.querySelector('#library-content').innerHTML = `
                ${renderIntro('Loading...')}
                <p class='${styles.status}'>LOADING...</p>
            `
        }

        function renderEmpty() {
            document.querySelector('#library-content').innerHTML = `
                ${renderIntro('0 anime')}
                <div class='${styles.empty}'>
                    <p class='${styles.emptyText}'>NO SAVED ANIME YET</p>
                    <a class='${styles.emptyLink}' href='/'>START BROWSING</a>
                </div>
            `
        }

        function renderList(items) {
            document.querySelector('#library-content').innerHTML = `
                ${renderIntro(`${items.length} anime in library`)}

                <div class='${styles.listContainer}'>
                    <div class='${styles.listHeader}'>
                        <span class='${styles.colIndex}'>#</span>
                        <span class='${styles.colTitleHeader}'>TITLE</span>
                        <span class='${styles.colGenre}'>GENRE</span>
                        <span class='${styles.colDate}'>DATE ADDED</span>
                        <span class='${styles.colAction}'></span>
                    </div>

                    <div class='${styles.list}'>
                        ${items
                            .map(({ anime, dateAdded }, i) => {
                                const japanese = anime.titleJapanese
                                    ? normalizeHTML(anime.titleJapanese)
                                    : ''

                                return `
                                    <div class='${styles.row}' data-pahe-id='${anime.paheId}'>
                                        <a
                                            class='${styles.rowLink}'
                                            href='/anime/${anime.paheId}'
                                            aria-label='Open ${normalizeHTML(anime.title)}'
                                        ></a>

                                        <span class='${styles.colIndex}'>
                                            ${String(i + 1).padStart(2, '0')}
                                        </span>

                                        <img
                                            class='${styles.thumb}'
                                            src='${normalizeHTML(anime.imageUrl)}'
                                            alt='${normalizeHTML(anime.title)}'
                                            loading='lazy'
                                        />

                                        <div class='${styles.titleGroup}'>
                                            <span class='${styles.rowTitle}'>${normalizeHTML(anime.title)}</span>
                                            ${japanese ? `<span class='${styles.rowSubtitle}'>${japanese}</span>` : ''}
                                        </div>

                                        <div class='${styles.colGenre}'>
                                            ${anime.genres
                                                .slice(0, 3)
                                                .map(
                                                    (genre) => `
                                                <span class='${styles.genre}'>${normalizeHTML(genre)}</span>
                                            `,
                                                )
                                                .join('')}
                                        </div>

                                        <span class='${styles.colDate}'>
                                            ${normalizeRelativeDate(dateAdded)}
                                        </span>

                                        <button
                                            type='button'
                                            class='${styles.removeButton}'
                                            data-action='unsave'
                                            data-pahe-id='${anime.paheId}'
                                            data-title='${normalizeHTML(anime.title)}'
                                            aria-label='Remove from library'
                                        >
                                            <img class='${styles.trashIcon}' src="${TrashIcon}" alt='Trash Icon' />
                                        </button>
                                    </div>
                                `
                            })
                            .join('')}
                    </div>
                </div>
            `

            document.querySelectorAll(`.${styles.row}`).forEach((row) => {
                row.addEventListener('click', (event) => {
                    // Don't navigate when clicking the remove button
                    if (event.target.closest('[data-action="unsave"]')) {
                        return
                    }

                    // Left click only
                    if (event.button !== 0) {
                        return
                    }

                    // Let Ctrl/Cmd-click, Shift-click, etc. behave normally
                    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                        window.open(`/anime/${row.dataset.paheId}`, '_blank', 'noopener,noreferrer')
                        return
                    }

                    window.app.pushRoute(`/anime/${row.dataset.paheId}`)
                })
            })

            document.querySelectorAll('[data-action="unsave"]').forEach((button) => {
                button.addEventListener('click', (event) => {
                    // Row click also navigates - stop it firing when the
                    // remove button itself was the target.
                    event.stopPropagation()

                    confirmDestructive({
                        title: 'Remove from library?',
                        message: `"${button.dataset.title}" will be removed from your library.`,
                        confirmLabel: 'Remove',
                        onConfirm: () => {
                            toggleSaved(button.dataset.paheId)
                            // Pushes into the shared store - the
                            // subscribeSavedIds(load) call below reacts to that
                            // and re-runs load() itself, so there's no direct
                            // load() call here (also keeps this page in sync if
                            // a save/unsave happens elsewhere while it's open).
                            syncSavedIds()
                        },
                    })
                })
            })
        }

        async function load() {
            // Sorted newest-saved-first, matching the reference design.
            const entries = getSavedEntries()
                .slice()
                .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))

            if (entries.length === 0) {
                renderEmpty()
                return
            }

            renderLoading()

            // allSettled, not all - a single stale/removed paheId (e.g. anime
            // pulled from the dataset since it was saved) shouldn't blank out
            // the whole list, just drop that one row. fetchAnimeByPaheId is
            // session-cached, so revisits/re-renders here don't re-hit the API.
            const results = await Promise.allSettled(
                entries.map((entry) => fetchAnimeByPaheId(entry.paheId)),
            )

            const items = results
                .map((result, i) =>
                    result.status === 'fulfilled'
                        ? { anime: result.value, dateAdded: entries[i].dateAdded }
                        : null,
                )
                .filter(Boolean)

            if (items.length === 0) {
                renderEmpty()
                return
            }

            renderList(items)
        }

        load()

        const unsubscribeSavedIds = subscribeSavedIds(load)

        return () => {
            unsubscribeSavedIds()
        }
    } catch (error) {
        console.error('Saved Page event:', error)
    }
}
