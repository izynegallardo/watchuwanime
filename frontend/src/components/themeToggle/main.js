import styles from './component.module.css'
import { isDarkTheme, toggleTheme, initTheme } from '@/utils/theme'

export default function ThemeToggle(root) {
    const render = () => {
        root.className = styles.themeToggle

        root.innerHTML = `
            <button id="toggleThemeBtn" class="${styles.themeButton}" type="button" aria-label="Toggle theme">
                <span class="${styles.darkLabel}">
                    DARK
                </span>

                <span class="${styles.textBorder}">|</span>

                <span class="${styles.lightLabel}">
                    LIGHT
                </span>

                <span class="${styles.switch}">
                    <span class="${styles.switchThumb}"></span>
                </span>
            </button>
        `

        updateState()

        root.querySelector('#toggleThemeBtn').addEventListener('click', () => {
            toggleTheme()
            updateState()
        })
    }

    const updateState = () => {
        const isDark = isDarkTheme()

        const thumb = root.querySelector(`.${styles.switchThumb}`)
        const darkLabel = root.querySelector(`.${styles.darkLabel}`)
        const lightLabel = root.querySelector(`.${styles.lightLabel}`)

        thumb.classList.toggle(styles.switchThumbLight, !isDark)

        darkLabel.classList.toggle(styles.textForeground, isDark)

        darkLabel.classList.toggle(styles.textMutedForeground, !isDark)

        lightLabel.classList.toggle(styles.textForeground, !isDark)

        lightLabel.classList.toggle(styles.textMutedForeground, isDark)
    }

    initTheme()
    render()
}
