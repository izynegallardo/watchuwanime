import styles from './component.module.css'
import { normalizeHTML, normalizeDate } from '@/utils/normalize'

// Pulls the 11-char video id out of any common YouTube URL shape so we can
// build an /embed/ URL for the iframe - the raw watch URL can't be embedded directly.
function toYoutubeEmbedUrl(url) {
    if (!url) return null

    const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null
}

export default function AnimeCard(anime, index, total, showTrailer = false) {
    const embedUrl = toYoutubeEmbedUrl(anime.youtubeUrl)
    const trailerActive = showTrailer && embedUrl

    const isAiredFrom = anime.aired_from ? `${normalizeDate(anime.aired_from)} to` : ''
    const isAiredTo = anime.aired_to ? `${normalizeDate(anime.aired_to)}` : ''
    const isSubTitle = anime.titleRomaji
        ? normalizeHTML(anime.titleRomaji)
        : normalizeHTML(anime.title)
    const isJapanese = anime.titleJapanese ? normalizeHTML(anime.titleJapanese) : ''
    const isEps = anime.episodes ? anime.episodes : '1'

    return `
        <div class='${styles.animeCard}'>
            <div class='${styles.animeCardTop}'>
                <div class='${styles.animeCardImage}' style="--bg-image: url('${normalizeHTML(anime.imageUrl)}')">
                    ${
                        trailerActive
                            ? `
                            <iframe
                                class='${styles.animeCardTrailer}'
                                src='${embedUrl}'
                                title='${normalizeHTML(anime.title)} trailer'
                                allow='autoplay; encrypted-media; picture-in-picture'
                                allowfullscreen
                            ></iframe>
                        `
                            : `
                            <img
                                src='${normalizeHTML(anime.imageUrl)}'
                                alt='${normalizeHTML(anime.title)}'
                                class='${styles.animeCardImg}'
                                loading='eager'
                            />

                            <div class='${styles.animeCardGradient}'></div>

                            <div class='${styles.animeCardMeta}'>
                                <span class='${styles.animeCardIndex}'>
                                    ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}
                                </span>

                                <span class='${styles.animeCardBadge}'>
                                    ${anime.type.toUpperCase()}
                                </span>
                            </div>
                        `
                    }

                    ${
                        embedUrl
                            ? `
                        <button
                            type='button'
                            class='${styles.animeCardTrailerToggle}'
                            data-action='toggle-trailer'
                            aria-label='${trailerActive ? 'Close trailer' : 'Play trailer'}'
                        >
                            ${trailerActive ? '✕ CLOSE' : '▶ TRAILER'}
                        </button>
                    `
                            : ''
                    }
                </div>

                <div class='${styles.animeCardInfo}'>
                    <div class='${styles.animeCardTitleRow}'>
                        <h2 class='${styles.animeCardTitle}'>${normalizeHTML(anime.title)}</h2>
                        <h3 class='${styles.animeCardSubTitle}'>${isSubTitle}</h3>
                        <h4 class='${styles.animeCardSubTitle}'>${isJapanese}</h4>
                        <span class='${styles.animeCardYear}'>Aired: ${isAiredFrom} ${isAiredTo}</span>
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
                        <span class='${styles.animeCardTag}'>${anime.durationMinutes} MIN</span>
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

                    <div class='${styles.animeCardTags}'>
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

            <div class='${styles.animeCardBody}'>
                <p class='${styles.animeCardSummary}'>${normalizeHTML(anime.summary)}</p>

                ${
                    anime.synopsis
                        ? `<p class='${styles.animeCardSynopsis}'>${normalizeHTML(anime.synopsis)}</p>`
                        : ''
                }
            </div>
        </div>
    `
}
