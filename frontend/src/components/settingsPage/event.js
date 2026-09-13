import styles from './component.module.css'
import {
    allowMatureGenres,
    setAllowMatureGenres,
    subscribeAllowMatureGenres,
    allowedSideStoryTypes,
    setAllowedSideStoryTypes,
} from '@/store/counter'
import { clearSaved } from '@/utils/saved'
import { syncSavedIds } from '@/store/saved'
import { confirmDestructive } from '@/utils/confirmDialog'

// Checkbox values below (data-type) must match SIDE_STORY_TYPES in
// backend/src/controllers/v1/animeController.js

export default function Events() {
    try {
        function renderSpecial() {
            const allowed = allowedSideStoryTypes()

            document.querySelector('#allow-special').innerHTML = `
                <div class='${styles.container}'>
                    <div class='${styles.containerHeader}'>
                        <p class='${styles.containerTitle}'>
                            Allow Side Stories
                        </p>
                        <p class='${styles.containerDescription}'>
                            Includes Special, ONA, OVA in in your recommendations.
                        </p>
                    </div>

                    <div class='${styles.toggleButtons}' role='checkboxgroup' aria-label='Allow Side Stories'>
                        <input
                            id='music'
                            class='${styles.checkbox}'
                            type='checkbox'
                            data-type='Music'
                            role='checkbox'
                            ${allowed.includes('Music') ? 'checked' : ''}
                        >
                        <label for='music' class='${styles.checkboxLabel}'>MUSIC</label>
                        <input
                            id='special'
                            class='${styles.checkbox}'
                            type='checkbox'
                            data-type='Special'
                            role='checkbox'
                            ${allowed.includes('Special') ? 'checked' : ''}
                        >
                        <label for='special' class='${styles.checkboxLabel}'>SPECIAL</label>
                        <input
                            id='ona'
                            class='${styles.checkbox}'
                            type='checkbox'
                            data-type='ONA'
                            role='checkbox'
                            ${allowed.includes('ONA') ? 'checked' : ''}
                        >
                        <label for='ona' class='${styles.checkboxLabel}'>ONA</label>
                        <input
                            id='ova'
                            class='${styles.checkbox}'
                            type='checkbox'
                            data-type='OVA'
                            role='checkbox'
                            ${allowed.includes('OVA') ? 'checked' : ''}
                        >
                        <label for='ova' class='${styles.checkboxLabel}'>OVA</label>
                    </div>
                </div>
            `

            document.querySelectorAll('[data-type]').forEach((checkbox) => {
                checkbox.addEventListener('change', () => {
                    const type = checkbox.dataset.type

                    setAllowedSideStoryTypes((prev) =>
                        checkbox.checked ? [...prev, type] : prev.filter((t) => t !== type),
                    )
                })
            })
        }

        function renderMature() {
            const mature = allowMatureGenres()

            document.querySelector('#allow-mature').innerHTML = `
                <div class='${styles.container}'>
                    <div class='${styles.containerHeader}'>
                        <p class='${styles.containerTitle}'>
                            Allow 18+ Results
                        </p>
                        <p class='${styles.containerDescription}'>
                            Includes mature genres (e.g. Ecchi) in your recommendations. Off by default.
                        </p>
                    </div>

                    <div class='${styles.toggleButtons}' role='radiogroup' aria-label='Allow 18+ results'>
                        <button
                            type='button'
                            class='${styles.toggleButton} ${!mature ? styles.active : ''}'
                            data-mature='false'
                            role='radio'
                            aria-checked='${!mature}'
                        >
                            OFF
                        </button>
                        <button
                            type='button'
                            class='${styles.toggleButton} ${mature ? styles.active : ''}'
                            data-mature='true'
                            role='radio'
                            aria-checked='${mature}'
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
                <div class='${styles.containerHeader}'>
                    <p class='${styles.containerTitle}'>
                        Clear Data
                    </p>
                    <p class='${styles.containerDescription}'>
                        Removes the saved anime lists in your library.
                    </p>
                </div>
                <button type='button' id='clear-save-button' class='${styles.clearButton}'>Clear data</button>
            `

            const clearButton = document.querySelector('#clear-save-button')

            clearButton.addEventListener('click', () => {
                confirmDestructive({
                    title: 'Clear library?',
                    message: `This removes every saved anime from this browser. This can't be undone.`,
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

        renderSpecial()
        renderMature()
        renderClearAnime()

        return subscribeAllowMatureGenres(renderMature)
    } catch (error) {
        console.error('Settings page event:', error)
    }
}
