import '@/styles/common.css'
import SPA from '@/core/spa'
import { requireRecommendations } from '@/core/routeGuard'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

inject()
injectSpeedInsights()

import NotFoundPage from '@/pages/notFoundPage'
import HomePage from '@/pages/homePage'
import QuestionPage from '@/pages/questionPage'
import ResultPage from '@/pages/resultPage'
import SummaryPage from '@/pages/summaryPage'
import AnimePage from '@/pages/animePage'

const app = new SPA({
    root: document.querySelector('#app'),
    defaultRoute: NotFoundPage,
})

window.app = app
app.add('/', HomePage)
app.add('/questions', QuestionPage)
app.add('/results', ResultPage, { guard: requireRecommendations })
app.add('/summary', SummaryPage, { guard: requireRecommendations })
app.add(/\/anime\/(?<paheId>[^/]+)/i, AnimePage)

app.handleRouteChanges()
