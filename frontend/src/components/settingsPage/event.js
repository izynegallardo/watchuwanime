import styles from './component.module.css'
import {
    allowMatureGenres,
    setAllowMatureGenres,
    subscribeAllowMatureGenres,
} from '@/store/counter'
import { clearSaved } from '@/utils/saved'
import { syncSavedIds } from '@/store/saved'
import { confirmDestructive } from '@/utils/confirmDialog'

export default function Events() {
    try {
        function renderMature() {
            const mature = allowMatureGenres()

            document.querySelector('#allow-mature').innerHTML = `
                <div class="${styles.container}">
                    <div class="${styles.containerHeader}">
                        <p class="${styles.containerTitle}">
                            Allow 18+ Results
                        </p>
                        <p class="${styles.containerDescription}">
                            Includes mature genres (e.g. Ecchi) in your recommendations. Off by default.
                        </p>
                    </div>

                    <div class="${styles.toggleButtons}" role="radiogroup" aria-label="Allow 18+ results">
                        <button
                            type="button"
                            class="${styles.toggleButton} ${!mature ? styles.active : ''}"
                            data-mature="false"
                            role="radio"
                            aria-checked="${!mature}"
                        >
                            OFF
                        </button>
                        <button
                            type="button"
                            class="${styles.toggleButton} ${mature ? styles.active : ''}"
                            data-mature="true"
                            role="radio"
                            aria-checked="${mature}"
                        >
                            ON
                        </button>
                    </div>
                </div>
            `

            document.querySelectorAll('[data-mature]').forEach((button) => {
                button.addEventListener('click', () => {
                    setAllowMatureGenres(button.dataset.mature === 'true')
                })
            })
        }

        function renderClearAnime() {
            document.querySelector('#clear-save').innerHTML = `
                <div class="${styles.containerHeader}">
                    <p class="${styles.containerTitle}">
                        Clear Data
                    </p>
                    <p class="${styles.containerDescription}">
                        Clears the saved anime lists that is stored in your browser.
                    </p>
                </div>
                <button type="button" id='clear-save-button' class="${styles.clearButton}">Clear data</button>
            `

            const clearButton = document.querySelector('#clear-save-button')

            clearButton.addEventListener('click', () => {
                confirmDestructive({
                    title: 'Clear library?',
                    message: "This removes every saved anime from this browser. This can't be undone.",
                    confirmLabel: 'Clear data',
                    onConfirm: () => {
                        clearSaved()
                        syncSavedIds()

                        clearButton.textContent = 'Cleared'
                        clearButton.disabled = true

                        setTimeout(() => {
                            clearButton.textContent = 'Clear data'
                            clearButton.disabled = false
                        }, 1500)
                    },
                })
            })
        }

        renderMature()
        renderClearAnime()

        return subscribeAllowMatureGenres(renderMature)
    } catch (error) {
        console.error('Settings page event:', error)
    }
}
