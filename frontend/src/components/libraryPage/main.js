import styles from './component.module.css'

export default function Main(root) {
    root.innerHTML = `
        <div id='library-content' class='${styles.libraryContent}'></div>
    `
    root.className = styles.library
}
