import styles from './component.module.css'
import { normalizeHTML } from '@/utils/normalize'

/**
 * Renders the grouped related-anime list (SEQUEL, SIDE STORY, etc.).
 * Pure presentational template - deliberately has no fetching/state logic of
 * its own, so it can be reused as-is from resultPage/card and from animePage
 * without duplicating markup between the two.
 *
 * @param {{status: 'idle'|'loading'|'loaded'|'error', groups: {relationType: string, anime: object[]}[]}} relationsState
 */
export default function AnimeRelations(relationsState) {
    if (relationsState.status === 'loading') {
        return `<p class='${styles.relationsStatus}'>LOADING RELATIONS...</p>`
    }

    if (relationsState.status === 'error') {
        return `<p class='${styles.relationsStatus}'>COULD NOT LOAD RELATIONS.</p>`
    }

    if (!relationsState.groups?.length) {
        return `<p class='${styles.relationsStatus}'>NO RELATED ANIME FOUND.</p>`
    }

    return `
        <div class='${styles.relationsLayout}'>
            ${relationsState.groups
                .map(
                    (group) => `
                        <div class='${styles.relationGroup}'>
                            <h3 class='${styles.relationGroupTitle}'>${normalizeHTML(group.relationType).toUpperCase()}</h3>

                            <div class='${styles.relationGrid}'>
                                ${group.anime
                                    .map(
                                        (related) => `
                                            <a class='${styles.relationCard}' href='/anime/${related.paheId}' target='_blank' rel='noopener'>
                                                <img
                                                    class='${styles.relationImage}'
                                                    src='${normalizeHTML(related.imageUrl)}'
                                                    alt='${normalizeHTML(related.title)}'
                                                    loading='lazy'
                                                />

                                                <div class='${styles.relationInfo}'>
                                                    <span class='${styles.relationTitle}'>${normalizeHTML(related.title)}</span>
                                                    <span class='${styles.relationMeta}'>
                                                        ${related.type || 'Unknown'}${related.episodes ? ` - ${related.episodes} Episodes` : ''} (${related.status || 'Unknown'})
                                                    </span>
                                                    ${related.season ? `<span class='${styles.relationMeta}'>${normalizeHTML(related.season)}</span>` : ''}
                                                </div>
                                            </a>
                                        `,
                                    )
                                    .join('')}
                            </div>
                        </div>
                    `,
                )
                .join('')}
        </div>
    `
}
