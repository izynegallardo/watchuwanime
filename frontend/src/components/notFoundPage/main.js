import styles from './component.module.css'
import EyeGlasses from '@/assets/wired-outline-243-glasses-hover-searching.gif'

export default function Main(root) {
    root.innerHTML = `
        <section class='${styles.notFoundSection}'>
            <img src="${EyeGlasses}" alt="Eye Glasses">
            <h1>404</h1>
            <h2>Oops... Page not found</h2>
            <a href='/'>Go back</a>
        </section>
    `

    root.className = styles.notFound
}
