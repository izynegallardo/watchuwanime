import styles from './component.module.css'

export default function Main(root) {
    root.innerHTML = `
        <div>
            <span id='user-counter' class='${styles.userCounter}'></span>

            <h2 class='${styles.questionTitle}'>
                WHAT IS YOUR FAVORITE ANIME AND WHY?
            </h2>

            <p class='${styles.questionDescription}'>
                Be specific. The more detail you share, the better your recommendations.
            </p>
        </div>

        <div id='text-area'></div>

        <div>
            <label class='${styles.formlabel} ${styles.genreLabel}'>
                GENRE PREFERENCES (OPTIONAL)
            </label>

            <div id='genre-list' class='${styles.genreList}'></div>
        </div>

        <div id='form-footer' class='${styles.formFooter}'></div>
    `

    root.className = styles.question
}
