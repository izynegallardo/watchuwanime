import '@/styles/common.css'
import SPA from '@/core/spa'
import NotFoundPage from '@/pages/notFoundPage'
import HomePage from '@/pages/homePage'
import QuestionPage from '@/pages/questionPage'
import Page from '@/pages/page'

const app = new SPA({
    root: document.querySelector('#app'),
    defaultRoute: NotFoundPage,
})

window.app = app
app.add('/', HomePage)
app.add(/\/questions\/(?<id>\d+)/i, QuestionPage)
app.add(/\/pages\/(?<id>\d+)/i, Page)

app.handleRouteChanges()
