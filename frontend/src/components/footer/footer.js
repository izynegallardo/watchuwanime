import styles from './component.module.css'
import githubLogo from '@/assets/github.svg'
import javascriptLogo from '@/assets/javascript.svg'
import viteLogo from '@/assets/old-vite.svg'

export default function Footer(root) {
    root.innerHTML = `
        <div class='${styles.footerDiv}'>
            <section class='${styles.footerSection}'>
                <span class='${styles.footerSpan}'>
                    Website powered by
                </span>
                <ul>
                    <li>
                        <a href='https://github.com/izynegallardo/watchuwanime' target='_blank'>
                            <img class='${styles.linkIcon} ${styles.github}' src="${githubLogo}" alt='Github logo'/></img>
                        </a>
                    </li>
                    <li>
                        <a href='https://vite.dev/' target='_blank'>
                            <img class='${styles.linkIcon} ${styles.vite}' src="${viteLogo}" alt='Vite logo'/>
                        </a>
                    </li>
                    <li>
                        <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
                            <img class='${styles.linkIcon} ${styles.javascipt}' src="${javascriptLogo}" alt='JavaScript logo'/>
                        </a>
                    </li>
                </ul>
            </section>
            <section>
                <span class='${styles.footerSpan}'>
                    &copy; ${new Date().getFullYear()} Watchuwanime Contributors. CC-BY / MIT
                </span>
            </section>

        </div>
    `

    root.className = styles.footer
}
