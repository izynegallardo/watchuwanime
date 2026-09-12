import styles from './component.module.css'
import {
    viewerCount,
    timeIndex,
    allowMatureGenres,
    selectedGenres,
    setSelectedGenres,
    subscribeSelectedGenres,
    currentUserIndex,
    setCurrentUserIndex,
    subscribeCurrentUserIndex,
    answer,
    setAnswer,
    sessionAnswers,
    setSessionAnswers,
    setRecommendations,
    shownIds,
    setShownIds,
} from '@/store/counter'
import { GENRES, THEMES } from '@/data/genres'
import { PLACEHOLDERS } from '@/data/placeholders'
import { TIME_STEPS } from '@/data/time'
import { fetchRecommendations } from '@/api/anime'
import { getRandomInt } from '@/utils/random'
import LoadingScreen from '@/components/loadingScreen/main'
import Main from './main'

const MIN_WORDS = 10

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

            const randIndex = getRandomInt(0, PLACEHOLDERS.length - 1)
            const placeholder = PLACEHOLDERS[randIndex]

            textareaEl.innerHTML = `
                <label class='${styles.formlabel}' for='answer-text-area'>
                    YOUR ANSWER
                </label>

                <textarea
                    id='answer-text-area'
                    class='${styles.answerTextarea}'
                    placeholder='${placeholder}'
                    rows='5'
                ></textarea>
            `

            // Restores previously typed text - needed when this markup is
            // rebuilt after a failed fetch (see restorePage()), since the
            // store keeps the answer but a fresh textarea starts empty.
            document.querySelector('#answer-text-area').value = answer()
        }

        function renderGenreList() {
            const genreListEl = document.querySelector('#genre-list')

            const GENTHEMES = [...GENRES, ...THEMES]

            genreListEl.innerHTML = GENTHEMES.map((genre) => {
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
                <button id='next-button' class='${styles.nextButton}' type='button'>
                    ${isLastUser() ? 'SEE RECOMMENDATIONS →' : 'NEXT USER →'}
                </button>
            `
            const nextButtonEl = document.querySelector('#next-button')

            nextButtonEl.addEventListener('click', handleNext)

            updateNextButton()
        }

        function getWordCount(text) {
            return text.match(/[a-zA-Z0-9]+/g)?.length ?? 0
        }

        function updateNextButton() {
            const textareaEl = document.querySelector('#answer-text-area')
            const nextButtonEl = document.querySelector('#next-button')

            if (!textareaEl || !nextButtonEl) return

            const wordCount = getWordCount(textareaEl.value)

            nextButtonEl.disabled = wordCount < MIN_WORDS
        }

        function wireAnswerInput() {
            const textareaEl = document.querySelector('#answer-text-area')

            textareaEl.addEventListener('input', (event) => {
                setAnswer(event.target.value)
                updateNextButton()
            })

            updateNextButton()
        }

        function showLoadingScreen() {
            LoadingScreen(document.querySelector('#main'))
        }

        function restorePage() {
            Main(document.querySelector('#main'))
            renderTextArea()
            render()
            wireAnswerInput()
        }

        let isFetchingRecommendations = false

        function handleNext() {
            const wordCount = getWordCount(answer())

            if (wordCount < MIN_WORDS) {
                updateNextButton()
                return
            }

            if (isLastUser()) {
                if (isFetchingRecommendations) return

                isFetchingRecommendations = true

                const allAnswers = [
                    ...sessionAnswers(),
                    {
                        genres: selectedGenres(),
                        answer: answer(),
                    },
                ]

                showLoadingScreen()

                fetchRecommendations(
                    allAnswers,
                    TIME_STEPS[timeIndex()],
                    shownIds(),
                    allowMatureGenres(),
                )
                    .then((data) => {
                        setSessionAnswers(allAnswers)
                        setRecommendations(data)
                        setShownIds((prev) => [...prev, ...data.map((anime) => anime.id)])

                        window.app.pushRoute('/results')
                    })
                    .catch((error) => {
                        console.error('Failed to fetch recommendations:', error)

                        isFetchingRecommendations = false
                        restorePage()
                    })

                return
            }

            setSessionAnswers((prev) => [
                ...prev,
                {
                    genres: selectedGenres(),
                    answer: answer(),
                },
            ])

            clearForNextUser()
            render()
        }

        function clearForNextUser() {
            setCurrentUserIndex((prev) => prev + 1)
            setSelectedGenres([])
            setAnswer('')

            document.querySelector('#answer-text-area').value = ''
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
