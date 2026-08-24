import styles from './component.module.css'
import { escapeHtml } from '@/utils/html'

export default function AnimeCard(anime, index, total) {
    const isMovie = anime.episodeCount === 1
    const runtime = isMovie ? `${anime.avgEpisodeMinutes} MIN` : `${anime.episodeCount} EPS`

    return `
        <div class='${styles.animeCard}'>
            <div class='${styles.animeCardImage}'>
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
                        ${isMovie ? 'FILM' : 'SERIES'}
                    </span>
                </div>
            </div>

            <div class='${styles.animeCardBody}'>
                <div class='${styles.animeCardTitleRow}'>
                    <h2 class='${styles.animeCardTitle}'>${escapeHtml(anime.title)}</h2>
                    <span class='${styles.animeCardYear}'>(${escapeHtml(anime.year)})</span>
                </div>

                <div class='${styles.animeCardTags}'>
                    ${anime.genres
                        .map(
                            (genre) => `
                        <span class='${styles.animeCardTag}'>${escapeHtml(genre).toUpperCase()}</span>
                    `,
                        )
                        .join('')}

                    <span class='${styles.animeCardTag}'>${runtime}</span>
                </div>

                <p class='${styles.animeCardSummary}'>${escapeHtml(anime.summary)}</p>
            </div>
        </div>
    `
}
