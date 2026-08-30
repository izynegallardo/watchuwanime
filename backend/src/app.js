import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import bodyParser from 'body-parser'
import morgan from 'morgan'

import v1 from './routes/v1/index.js'

const app = express()

app.use(morgan('dev'))
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

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
