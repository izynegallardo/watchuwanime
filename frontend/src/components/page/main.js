import styles from './component.module.css'

export default function Main(root, params) {
    root.innerHTML = `
        <div class='${styles['page-div']}'>
            <section class='${styles['page-section']}'>    
                <h1>You're on page: ${params?.id}</h1>
                <div id='link-div' class='${styles['link-div']}'></div>
            </section>
        </div>
    `
    root.className = styles['page']
}
