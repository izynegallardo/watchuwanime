import styles from './component.module.css'
import settingsIcon from '@/assets/settings.svg'
import BookMarkIcon from '@/assets/bookmark1.svg'

export default function Navigation(root) {
    root.innerHTML = `
        <ul>
            <li class='${styles.list}'>
                <a href='/'>WATCHUWANIME</a>
            </li>
            <li>
                <a href='/library'><img class='${styles.bookMarkIcon}' src="${BookMarkIcon}" alt='Bookmark Icon'></a>
                <a href='/settings'><img class='${styles.settingsIcon}' src="${settingsIcon}" alt='Gear Icon'></a>
            </li class='${styles.list}'>
        </ul>
    `

    root.className = styles.navigation
}
