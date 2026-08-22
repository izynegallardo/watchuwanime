import styles from './component.module.css'
import ThemeToggle from '@/themeToggle/main'

export default function Navigation(root) {
    root.innerHTML = `
        <ul>
            <li><a href='/'>WATCHUWANIME</a></li>
            <li id='li-theme-toggle'></li>
        </ul>
    `

    root.className = styles['navigation']
    ThemeToggle(document.getElementById('li-theme-toggle'))
}
