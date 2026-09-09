import styles from './component.module.css'
import githubLogo from '@/assets/github.svg'
import vercelLogo from '@/assets/vercel.svg'
import renderLogo from '@/assets/render.svg'

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
                            <img class='${styles.linkIcon} ${styles.white}' src="${githubLogo}" alt='Github logo'/></img>
                        </a>
                    </li>
                    <li>
                        <a href="https://vercel.com/" target="_blank">
                            <img class='${styles.linkIcon} ${styles.white}' src="${vercelLogo}" alt='Vercel logo'/>
                        </a>
                    </li>
                    <li>
                        <a href="https://render.com/" target="_blank">
                            <img class='${styles.linkIcon} ${styles.white}' src="${renderLogo}" alt='Render logo'/>
                        </a>
                    </li>
                </ul>
            </section>
            <section>
                <span class='${styles.footerSpan}'>
                    &copy; ${new Date().getFullYear()} Watchuwanime Contributors. MIT
                </span>
            </section>

        </div>
    `

    root.className = styles.footer
}
