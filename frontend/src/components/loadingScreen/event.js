import styles from './component.module.css'
import { MESSAGES } from '@/data/messages'

export default function Events(root) {
    try {
        const message = root.querySelector(`.${styles.message}`)

        setInterval(() => {
            const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

            message.classList.remove(styles.fadeIn)

            void message.offsetWidth

            message.textContent = randomMessage
            message.classList.add(styles.fadeIn)
        }, 1000)
    } catch (error) {
        console.log('Loading Screen Event:', error)
    }
}
