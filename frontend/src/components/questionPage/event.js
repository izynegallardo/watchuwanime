import styles from './component.module.css'
import {
    viewerCount,
    timeIndex,
    allowMatureGenres,
    allowedSideStoryTypes,
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
import { TEMPLATE } from '@/data/template'
import { fetchRecommendations } from '@/api/anime'
import { getRandomInt } from '@/utils/random'
import { confirmAction } from '@/utils/confirmDialog'
import LoadingScreen from '@/components/loadingScreen/main'
import LoadingScreenEvents from '@/components/loadingScreen/event'
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
                <div class='${styles.footerButtons}'>
                    <button id='surprise-button' class='${styles.surpriseButton}' type='button'>
                        SURPRISE ME
                    </button>

                    <button id='next-button' class='${styles.nextButton}' type='button'>
                        ${isLastUser() ? 'SEE RECOMMENDATIONS →' : 'NEXT USER →'}
                    </button>
                </div>
            `
            const nextButtonEl = document.querySelector('#next-button')
            const surpriseButtonEl = document.querySelector('#surprise-button')

            nextButtonEl.addEventListener('click', handleNext)
            surpriseButtonEl.addEventListener('click', handleSurprise)

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

        let stopLoadingScreen = null

        function showLoadingScreen() {
            const root = document.querySelector('#main')
            LoadingScreen(root)
            stopLoadingScreen = LoadingScreenEvents(root)
        }

        function restorePage() {
            Main(document.querySelector('#main'))
            renderTextArea()
            render()
            wireAnswerInput()
        }

        let isFetchingRecommendations = false

        // Shared by the normal last-user submit and Surprise Me - both end up
        // fetching recommendations from a finished `allAnswers` array and
        // handing off to the results page the same way.
        function submitAnswers(allAnswers) {
            if (isFetchingRecommendations) return

            isFetchingRecommendations = true

            showLoadingScreen()

            fetchRecommendations(
                allAnswers,
                TIME_STEPS[timeIndex()],
                shownIds(),
                allowMatureGenres(),
                allowedSideStoryTypes(),
            )
                .then((data) => {
                    stopLoadingScreen?.()

                    setSessionAnswers(allAnswers)
                    setRecommendations(data)
                    setShownIds((prev) => [...prev, ...data.map((anime) => anime.id)])

                    window.app.pushRoute('/results')
                })
                .catch((error) => {
                    stopLoadingScreen?.()

                    console.error('Failed to fetch recommendations:', error)

                    isFetchingRecommendations = false
                    restorePage()
                })
        }

        function handleNext() {
            const wordCount = getWordCount(answer())

            if (wordCount < MIN_WORDS) {
                updateNextButton()
                return
            }

            if (isLastUser()) {
                const allAnswers = [
                    ...sessionAnswers(),
                    {
                        genres: selectedGenres(),
                        answer: answer(),
                    },
                ]

                submitAnswers(allAnswers)
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

        // Picks a random prompt from TEMPLATE, fills it in as this user's
        // answer/genres, and submits immediately - ignoring sessionAnswers()
        // from any earlier users in this round. With more than one viewer that
        // means the remaining viewer(s) never get to answer, so it's gated
        // behind a confirmation first.
        function handleSurprise() {
            if (isFetchingRecommendations) return

            const template = TEMPLATE[getRandomInt(0, TEMPLATE.length - 1)]

            function proceed() {
                setSelectedGenres(template.genres)
                setAnswer(template.answer)

                const textareaEl = document.querySelector('#answer-text-area')
                if (textareaEl) textareaEl.value = template.answer

                updateNextButton()

                submitAnswers([{ genres: template.genres, answer: template.answer }])
            }

            if (viewerCount() > 1) {
                confirmAction({
                    title: 'Surprise me?',
                    message: `This fills in a random request and submits it right away, skipping the remaining ${viewerCount() - 1} viewer(s) for this round.`,
                    confirmLabel: 'Surprise me',
                    onConfirm: proceed,
                })
                return
            }

            proceed()
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
