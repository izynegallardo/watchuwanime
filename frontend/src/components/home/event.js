import styles from './component.module.css'
import { TIME_STEPS, TIME_LABELS } from '@/data/time'
import {
    viewerCount,
    setViewerCount,
    subscribeViewerCount,
    timeIndex,
    setTimeIndex,
    subscribeTimeIndex,
    setSessionAnswers,
    setShownIds,
    setCurrentUserIndex,
    setSelectedGenres,
    setAnswer,
} from '@/store/counter'

export default function Events() {
    try {
        setSessionAnswers([])
        setShownIds([])
        setCurrentUserIndex(0)
        setSelectedGenres([])
        setAnswer('')
        // console.log('Viewer count:', viewerCount())

        function renderForm() {
            const currentTimeIndex = timeIndex()
            const currentViewerCount = viewerCount()
            const timeAvailable = TIME_STEPS[currentTimeIndex]

            // console.log('Time available:', timeAvailable)

            document.querySelector('#form').innerHTML = `
                <section class='${styles.section}'>
                    <div class='${styles.sectionHeader}'>
                        <div class='${styles.sectionSubHeader}'>
                            <span class='${styles.label} ${styles.sectionNumber}'>
                                01
                            </span>

                            <span class='${styles.value}'>
                            ${currentViewerCount}
                            </span>
                        </div>
                        <p class='${styles.sectionTitle}'>
                            HOW MANY PEOPLE ARE WATCHING?
                        </p>
                    </div>

                    <div class='${styles.peopleButtons}'>
                        ${Array.from({ length: 10 }, (_, i) => {
                            const n = i + 1

                            return `
                                <button
                                    type='button'
                                    class='${styles.peopleButton} ${currentViewerCount === n ? styles.active : ''}'
                                    data-viewers='${n}'
                                >
                                    ${n}
                                </button>
                            `
                        }).join('')}
                    </div>
                </section>

                <section class='${styles.section}'>
                    <div class='${styles.sectionHeader}'>
                        <div class='${styles.sectionSubHeader}'>
                            <span class='${styles.label} ${styles.sectionNumber}'>
                                02
                            </span>

                            <span class='${styles.timeValue}'>
                                ${TIME_LABELS[timeAvailable]}
                            </span>
                        </div>
                        <p class='${styles.sectionTitle}'>
                            HOW MUCH TIME DO YOU HAVE?
                        </p>
                    </div>

                    <input
                        type='range'
                        min='0'
                        max='${TIME_STEPS.length - 1}'
                        step='1'
                        value='${currentTimeIndex}'
                        class='${styles.range}'
                        aria-label='Time available'
                        id='time-range'
                    />

                    <div class='${styles.timeLabels}'>
                        ${TIME_STEPS.map(
                            (time, i) => `
                            <button
                                type='button'
                                class='${styles.timeLabel} ${styles[`time_${time}`]} ${currentTimeIndex === i ? styles.active : ''}'
                                data-time-index='${i}'
                                aria-pressed='${currentTimeIndex === i}'
                            >
                                ${TIME_LABELS[time]}
                            </button>
                        `,
                        ).join('')}
                    </div>
                </section>

                <section class='${styles.section}'>
                    <a class='${styles.nextLink}' href='/questions'>
                        NEXT →
                    </a>
                </section>
            `

            document.querySelectorAll('[data-viewers]').forEach((button) => {
                button.addEventListener('click', () => {
                    setViewerCount(Number(button.dataset.viewers))
                    // console.log('Viewer count:', currentViewerCount)
                })
            })

            document.querySelector('#time-range').addEventListener('input', (event) => {
                setTimeIndex(Number(event.target.value))
            })

            document.querySelectorAll('[data-time-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    setTimeIndex(Number(button.dataset.timeIndex))
                })
            })
        }

        renderForm()

        const unsubscribeViewerCount = subscribeViewerCount(renderForm)
        const unsubscribeTimeIndex = subscribeTimeIndex(renderForm)

        return () => {
            unsubscribeViewerCount()
            unsubscribeTimeIndex()
        }
    } catch (error) {
        console.error('Home page event:', error)
    }
}
