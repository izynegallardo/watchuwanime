import rateLimit from 'express-rate-limit'
import { success } from 'zod'

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export default apiLimiter
