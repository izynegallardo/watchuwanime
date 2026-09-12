import styles from './component.module.css'
import AnimeRelations from '../relations/main'
import { normalizeHTML, normalizeDate } from '@/utils/normalize'
import { isSaved } from '@/utils/saved'
import BookMarkIcon from '@/assets/bookmark.svg'
import UnBookMarkIcon from '@/assets/unbookmark.svg'

// Pulls the 11-char video id out of any common YouTube URL shape so we can
// build an /embed/ URL for the iframe - the raw watch URL can't be embedded directly.
function toYoutubeEmbedUrl(url) {
    if (!url) return null

    const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null
}

/**
 * Patches every save button currently in the DOM to match localStorage,
 * without a full render() - keeps a playing trailer iframe alive (see the
 * toggle-save handlers in resultPage/event.js and animePage/event.js for
 * why that matters). Meant to be called from a subscribeSavedIds()
 * callback, not directly from the click handler itself.
 *
 * Uses querySelectorAll (not a single querySelector) so this stays correct
 * even if a future layout ever renders more than one card at once.
 */
export function syncSaveButtons() {
    document.querySelectorAll('[data-action="toggle-save"]').forEach((button) => {
        const saved = isSaved(button.dataset.paheId)

        button.setAttribute('aria-pressed', String(saved))
        button.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save anime')

        const icon = button.querySelector('img')
        if (icon) icon.src = saved ? BookMarkIcon : UnBookMarkIcon
    })
}

export default function AnimeCard(
    anime,
    index,
    total,
    showTrailer = false,
    activeTab = 'summary',
    relationsState = { status: 'idle', groups: [] },
) {
    const embedUrl = toYoutubeEmbedUrl(anime.youtubeUrl)
    const trailerActive = showTrailer && embedUrl
    const hasRelations = Boolean(anime.relations?.length)
    const currentTab = hasRelations ? activeTab : 'summary'

    const isAiredFrom = anime.aired_from ? `${normalizeDate(anime.aired_from)}` : ''
    const isAiredTo = anime.aired_to ? `${normalizeDate(anime.aired_to)}` : ''
    const isBoth = isAiredFrom && isAiredTo ? 'to' : ''
    const isSubTitle = anime.titleRomaji
        ? normalizeHTML(anime.titleRomaji)
        : normalizeHTML(anime.title)
    const isJapanese = anime.titleJapanese ? normalizeHTML(anime.titleJapanese) : ''
    const isEps = anime.episodes ? anime.episodes : '1'
    const saved = isSaved(anime.paheId)

    return `
        <div class='${styles.animeCard}'>
            ${
                trailerActive
                    ? `
                <div class='${styles.animeCardTrailerWrapper}'>
                    <div class='${styles.animeCardTrailerBar}'>
                        <button
                            type='button'
                            class='${styles.animeCardTrailerClose}'
                            data-action='toggle-trailer'
                            aria-label='Close trailer'
                        >
                            ✕ CLOSE
                        </button>
                    </div>

                    <div class='${styles.animeCardTrailerVideo}'>
                        <iframe
                            class='${styles.animeCardTrailer}'
                            src='${embedUrl}'
                            title='${normalizeHTML(anime.title)} trailer'
                            allow='autoplay; encrypted-media; picture-in-picture'
                            allowfullscreen
                        ></iframe>
                    </div>
                </div>
            `
                    : ''
            }

            ${
                !trailerActive
                    ? `
                    <div class='${styles.animeCardTop}'>
                        <div class='${styles.animeCardImage}' style="--bg-image: url('${normalizeHTML(anime.imageUrl)}')">
                            <img
                                src='${normalizeHTML(anime.imageUrl)}'
                                alt='${normalizeHTML(anime.title)}'
                                class='${styles.animeCardImg}'
                                loading='eager'
                            />

                            <div class='${styles.animeCardGradient}'></div>

                            <div class='${styles.animeCardMeta}'>
                                ${
                                    total > 1
                                        ? `
                                    <span class='${styles.animeCardIndex}'>
                                        ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}
                                    </span>
                                `
                                        : '<span></span>'
                                }
                                <span class='${styles.animeCardBadge}'>
                                    ${anime.type.toUpperCase()}
                                </span>
                            </div>

                            ${
                                embedUrl && !trailerActive
                                    ? `
                                <button
                                    type='button'
                                    class='${styles.animeCardTrailerToggle}'
                                    data-action='toggle-trailer'
                                    aria-label='Play trailer'
                                >
                                    ▶ TRAILER
                                </button>
                            `
                                    : ''
                            }
                        </div>

                        <div class='${styles.animeCardInfo}'>
                            <div class='${styles.animeCardTitleRowTop}'>
                                <div class='${styles.animeCardTitleRow}'>
                                    <h2 class='${styles.animeCardTitle}'>${normalizeHTML(anime.title)}</h2>
                                    <h3 class='${styles.animeCardSubTitle}'>${isSubTitle}</h3>
                                    <h4 class='${styles.animeCardSubTitle}'>${isJapanese}</h4>
                                    <span class='${styles.animeCardYear}'>Aired: ${isAiredFrom} ${isBoth} ${isAiredTo}</span>
                                </div>

                                <div>
                                    <button
                                        type='button'
                                        class='${styles.animeCardSave}'
                                        data-action='toggle-save'
                                        data-pahe-id='${anime.paheId}'
                                        aria-label='${saved ? 'Remove from saved' : 'Save anime'}'
                                        aria-pressed='${saved}'
                                    >
                                        <img class='${styles.animeCardSaveIcon}' src="${saved ? BookMarkIcon : UnBookMarkIcon}">
                                    </button>
                                </div>
                            </div>

                            <div class='${styles.animeCardTags}'>
                                ${anime.genres
                                    .map(
                                        (genre) => `
                                            <span class='${styles.animeCardTag}'>${normalizeHTML(genre).toUpperCase()}</span>
                                        `,
                                    )
                                    .join('')}
                                ${anime.themes
                                    .map(
                                        (theme) => `
                                        <span class='${styles.animeCardTag}'>${normalizeHTML(theme).toUpperCase()}</span>
                                    `,
                                    )
                                    .join('')}
                                ${anime.demographics
                                    .map(
                                        (demographic) => `
                                        <span class='${styles.animeCardTag}'>${normalizeHTML(demographic).toUpperCase()}</span>
                                    `,
                                    )
                                    .join('')}

                                <span class='${styles.animeCardTag}'>${anime.season}</span>
                            </div>

                            <div class='${styles.animeCardTags}'>
                                <span class='${styles.animeCardTag}'>${anime.durationMinutes || ''} MIN</span>
                                <span class='${styles.animeCardTag}'>${isEps} EPS</span>
                                <span class='${styles.animeCardTag}'>${anime.status}</span>
                            </div>

                            <div class='${styles.animeCardTags}'>
                                ${anime.studios
                                    .map(
                                        (studio) => `
                                        <span class='${styles.animeCardTag}'>${normalizeHTML(studio).toUpperCase()}</span>
                                    `,
                                    )
                                    .join('')}
                            </div>

                            <div class='${styles.animeCardTags} ${styles.noMargin}'>
                                ${anime.external_links
                                    .map(
                                        (external_link) => `
                                            <a class='${styles.animeCardTag}' href='${external_link.url}' target='_blank'>
                                                ${normalizeHTML(external_link.name)}
                                            </a>
                                        `,
                                    )
                                    .join('')}
                            </div>
                        </div>
                    </div>
                    `
                    : `
                    <div class='${styles.animeCardTop}'>
                        <div class='${styles.animeCardInfo}'>
                            <div class='${styles.animeCardTitleRow}'>
                                <h2 class='${styles.animeCardTitle}'>${normalizeHTML(anime.title)}</h2>
                            </div>

                            <div class='${styles.animeCardTags}'>
                                <span class='${styles.animeCardTag}'>${anime.durationMinutes} MIN</span>
                                <span class='${styles.animeCardTag}'>${isEps} EPS</span>
                                <span class='${styles.animeCardTag}'>${anime.status}</span>
                            </div>

                            <div class='${styles.animeCardTags} ${styles.noMargin}'>
                                ${anime.external_links
                                    .map(
                                        (external_link) => `
                                            <a class='${styles.animeCardTag}' href='${external_link.url}' target='_blank'>
                                                ${normalizeHTML(external_link.name)}
                                            </a>
                                        `,
                                    )
                                    .join('')}
                            </div>
                        </div>
                    </div>         
                `
            } 

            <div class='${styles.animeCardTabs}'>
                <button
                    type='button'
                    class='${styles.animeCardTab} ${currentTab === 'summary' ? styles.animeCardTabActive : ''}'
                    data-tab='summary'
                >
                    SUMMARY
                </button>

                ${
                    hasRelations
                        ? `
                    <button
                        type='button'
                        class='${styles.animeCardTab} ${currentTab === 'relations' ? styles.animeCardTabActive : ''}'
                        data-tab='relations'
                    >
                        RELATIONS
                    </button>
                `
                        : ''
                }
            </div>

            <div class='${styles.animeCardBody}'>
                ${
                    currentTab === 'relations'
                        ? AnimeRelations(relationsState)
                        : `
                        <p class='${styles.animeCardSummary}'>${normalizeHTML(anime.summary)}</p>

                        ${
                            anime.synopsis
                                ? `<p class='${styles.animeCardSynopsis}'>${normalizeHTML(anime.synopsis)}</p>`
                                : ''
                        }
                    `
                }
            </div>
        </div>
    `
}
