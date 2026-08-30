import { Router } from 'express'

import homeRouter from './homeRouter.js'
import animeRouter from './animeRouter.js'

const v1 = new Router()

v1.use('/', homeRouter)
v1.use('/anime', animeRouter)

export default v1
