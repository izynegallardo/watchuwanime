import styles from './component.module.css'
import {
    viewerCount,
    selectedGenres,
    setSelectedGenres,
    subscribeSelectedGenres,
    currentUserIndex,
    setCurrentUserIndex,
    subscribeCurrentUserIndex,
    setAnswer,
    setRecommendations,
    setShownIds,
} from '@/store/counter'
import { GENRES } from '@/data/genres'
import { PLACEHOLDERS } from '@/data/placeholders'
import { fetchRecommendations } from '@/api/anime'
import { getRandomInt } from '@/utils/random'

export default function Events() {
    try {
        function isLastUser() {
            return currentUserIndex() + 1 >= viewerCount()
        }

        function renderUserCounter() {
            document.querySelector('#user-counter').textContent =
                `USER ${String(currentUserIndex() + 1).padStart(2, '0')} OF ${String(viewerCount()).padStart(2, '0')}`
        }

        function renderTextArea() {
            const textareaEl = document.querySelector('#text-area')

            const randIndex = getRandomInt(0, PLACEHOLDERS.length)
            const placeholder = PLACEHOLDERS[randIndex]

            textareaEl.innerHTML = `
                <label class='${styles.formlabel}'>
                    YOUR ANSWER
                </label>

                <textarea
                    id='answer-text-area'
                    class='${styles.answerTextarea}'
                    placeholder='${placeholder}'
                    rows='5'
                ></textarea>
            `
        }

        function renderGenreList() {
            const genreListEl = document.querySelector('#genre-list')

            genreListEl.innerHTML = GENRES.map((genre) => {
                const active = selectedGenres().includes(genre)

                return `
                    <button
                        type='button'
                        class='${styles.genreButton} ${active ? styles.active : ''}'
                        data-genre='${genre}'
                    >
                        ${genre.toUpperCase()}
                    </button>
                `
            }).join('')

            genreListEl.querySelectorAll('[data-genre]').forEach((button) => {
                button.addEventListener('click', () => toggleGenre(button.dataset.genre))
            })
        }

        function toggleGenre(genre) {
            setSelectedGenres((prev) =>
                prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
            )
        }

        function renderFooterBtn() {
            document.querySelector('#form-footer').innerHTML = `
                <a id='next-link' class='${styles.nextLink}'>
                    ${isLastUser() ? 'SEE RECOMMENDATIONS →' : 'NEXT USER →'}
                </a>
            `

            document.querySelector('#next-link').addEventListener('click', handleNext)
        }

        function wireAnswerInput() {
            document.querySelector('#answer-text-area').addEventListener('input', (event) => {
                setAnswer(event.target.value)
            })
        }

        let isFetchingRecommendations = false

        function handleNext() {
            if (isLastUser()) {
                if (isFetchingRecommendations) return
                isFetchingRecommendations = true

                const nextLinkEl = document.querySelector('#next-link')
                nextLinkEl.textContent = 'LOADING...'

                fetchRecommendations()
                    .then((data) => {
                        setRecommendations(data)
                        setShownIds(data.map((anime) => anime.id))
                        window.app.pushRoute('/results')
                    })
                    .catch((error) => {
                        console.error('Failed to fetch recommendations:', error)
                        isFetchingRecommendations = false
                        nextLinkEl.textContent = 'SEE RECOMMENDATIONS →'
                    })

                return
            }

            setCurrentUserIndex((prev) => prev + 1)
            setSelectedGenres([])
            setAnswer('')
            document.querySelector('#answer-text-area').value = ''
            render()
        }

        function render() {
            renderUserCounter()
            renderGenreList()
            renderFooterBtn()
        }

        renderTextArea()
        render()
        wireAnswerInput()

        const unsubscribeSelectedGenres = subscribeSelectedGenres(render)
        const unsubscribeCurrentUserIndex = subscribeCurrentUserIndex(render)

        return () => {
            unsubscribeSelectedGenres()
            unsubscribeCurrentUserIndex()
        }
    } catch (error) {
        console.log('Question Page Event:', error)
    }
}
