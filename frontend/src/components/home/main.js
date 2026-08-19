import styles from './component.module.css'

export default function Main(root) {
    root.innerHTML = `
        <div class="${styles.intro}">
            <div class="${styles.introLabel}">
                <span class="${styles.label}">
                    WHAT ANIME YOU WANT
                </span>
            </div>

            <h1 class="${styles.title}">
                WATCH
                <br/>
                U
                <br/>
                WANIME
            </h1>

            <p class="${styles.description}">
                Stop wasting time finding your next favorite anime. 
                Just answer a few questions, and Watchuwanime will recommend one for you.
            </p>
        </div>

        <div id='form' class="${styles.form}"></div>
    `

    root.className = styles.home
}
