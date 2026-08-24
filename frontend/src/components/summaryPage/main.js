import styles from './component.module.css'

export default function Main(root) {
    root.innerHTML = `
        <div class='${styles.summaryHeader}'>
            <span class='${styles.headerLabel}'>
                ALL RECOMMENDATIONS
            </span>
        </div>

        <div id='table-container' class='${styles.tableContainer}'> </div>

        <div id='actions-container' class='${styles.actions}'></div>

        <p class='${styles.hint}'>
            CLICK ANY ROW TO VIEW DETAILS
        </p>
    `

    root.className = styles.summary
}
