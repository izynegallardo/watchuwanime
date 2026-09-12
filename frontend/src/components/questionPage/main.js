import styles from './component.module.css'

export default function Main(root) {
    root.innerHTML = `
        <div>
            <span id='user-counter' class='${styles.userCounter}'></span>

            <h2 class='${styles.questionTitle}'>
                WHAT KIND OF ANIME ARE YOU LOOKING FOR RIGHT NOW?
            </h2>

            <p class='${styles.questionDescription}'>
                Describe the mood, experience, or type of story you’re craving. 
                The more you tell us, the better we can match your vibe.
            </p>
        </div>

        <div id='text-area'></div>

        <fieldset class='${styles.genreFieldset}'>
            <legend class='${styles.formlabel} ${styles.genreLabel}'>
                GENRE PREFERENCES (OPTIONAL)
            </legend>

            <div id='genre-list' class='${styles.genreList}'></div>
        </fieldset>

        <div id='form-footer' class='${styles.formFooter}'></div>
    `

    root.className = styles.question
}
