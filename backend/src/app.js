import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import morgan from 'morgan'

import v1 from './routes/v1/index.js'

const app = express()

app.set('trust proxy', 1)
app.get('/healthz', (request, response) => response.status(200).send('ok'))
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const allowedOrigins = process.env.FRONTEND_URLS.split(',').map((url) => url.trim())

app.use(
    '/api/v1',
    cors({
        origin: (origin, callback) => {
            callback(null, !origin || allowedOrigins.includes(origin))
        },
    }),
    v1,
)

export default app
