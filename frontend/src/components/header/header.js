import styles from './component.module.css'
import Navigation from '@/components/navigation/main'

export default function Header(root) {
    root.innerHTML = `
        <div id='header-div'></div>
    `

    root.className = styles['header']

    Navigation(document.getElementById('header-div'))
}
