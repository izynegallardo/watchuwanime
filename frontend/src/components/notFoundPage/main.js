import styles from './component.module.css'

export default function Main(root) {
    root.innerHTML = `
        <div class="${styles['notFoundPage-div']}">
            <section class="${styles['notFoundPage-section']}">
                <main>
                    <h1>Page not found</h1>
                </main>
            </section>
        </div>
    `

    root.className = styles['notFoundPage']
}
