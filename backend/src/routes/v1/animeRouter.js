import { Router } from 'express'
import AnimeController from '../../controllers/v1/animeController.js'
import authorization from '../../middlewares/authorization.js'
import apiLimiter from '../../middlewares/rateLimit.js'

const animeRouter = new Router()
const anime = new AnimeController()

animeRouter.use(authorization)
animeRouter.use(apiLimiter)

animeRouter.post('/recommend', anime.recommend.bind(anime))

export default animeRouter
