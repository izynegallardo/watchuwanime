import styles from './component.module.css'
import ThemeToggle from '@/components/themeToggle/main'

export default function Main(root) {
    root.innerHTML = `
        <div class="${styles.intro}">
            <div class="${styles.introLabel}">
                <span class="${styles.label}">
                    PREFERENCES
                </span>
            </div>

            <h1 class="${styles.title}">
                SETTINGS
            </h1>

            <p class="${styles.description}">
                Control how recommendations are generated for this browser.
            </p>
        </div>

        <section class="${styles.form}">
            <div id='theme-toggle-mount'>
                <div class="${styles.container}">
                    <div class="${styles.containerHeader}">
                        <p class="${styles.containerTitle}">
                            Theme
                        </p>
                        <p class="${styles.containerDescription}">
                            Switch between light and dark mode for this browser.
                        </p>
                    </div>
                </div>
            </div>

            <div id='allow-mature'></div>

            <div id='clear-save' class="${styles.clearSave}"></div>
        </section>
    `

    ThemeToggle(document.querySelector('#theme-toggle-mount'))
    root.className = styles.settings
}
