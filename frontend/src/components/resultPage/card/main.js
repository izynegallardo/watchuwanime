import styles from './component.module.css'
import { escapeHtml } from '@/utils/html'

export default function AnimeCard(anime, index, total) {
    const isYear = anime.year ? `(${escapeHtml(anime.year)})` : ''

    return `
        <div class='${styles.animeCard}'>
            <div class='${styles.animeCardImage}' style="--bg-image: url('${escapeHtml(anime.imageUrl)}')">
                <img
                    src='${escapeHtml(anime.imageUrl)}'
                    alt='${escapeHtml(anime.title)}'
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
            </div>

            <div class='${styles.animeCardBody}'>
                <div class='${styles.animeCardTitleRow}'>
                    <h2 class='${styles.animeCardTitle}'>${escapeHtml(anime.titleEnglish)}</h2>
                    <h3 class='${styles.animeCardYear}'>${escapeHtml(anime.title)}</h3>
                    <span class='${styles.animeCardYear}'>${isYear}</span>
                </div>

                <div class='${styles.animeCardTags}'>
                    ${anime.genres
                        .map(
                            (genre) => `
                        <span class='${styles.animeCardTag}'>${escapeHtml(genre).toUpperCase()}</span>
                    `,
                        )
                        .join('')}

                    <span class='${styles.animeCardTag}'>${anime.durationMinutes} MIN</span>
                    <span class='${styles.animeCardTag}'>${anime.episodes} EPS</span>
                    <span class='${styles.animeCardTag}'>${anime.status}</span>
                    <span class='${styles.animeCardTag}'>${anime.rating}</span>
                </div>

                <p class='${styles.animeCardSummary}'>${escapeHtml(anime.summary)}</p>

                ${
                    anime.synopsis
                        ? `<p class='${styles.animeCardSynopsis}'>${escapeHtml(anime.synopsis)}</p>`
                        : ''
                }
            </div>
        </div>
    `
}
