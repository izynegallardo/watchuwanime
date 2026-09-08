import styles from './component.module.css'
import Wand from '@/assets/wired-outline-2844-magic-wand-loop-cycle.gif'
import { MESSAGES } from '@/data/messages'

export default function Main(root) {
    const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

    root.innerHTML = `
        <img src="${Wand}" alt="Magic Wand">
        <h1 class="${styles.message} ${styles.fadeIn}">
            ${randomMessage}
        </h1>
    `

    root.className = styles.loadingScreen
}
