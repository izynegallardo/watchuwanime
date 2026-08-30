import request from 'supertest'
import app from '../../../app.js'

describe('GET /api/v1/', () => {
    it('returns the API running message', async () => {
        const res = await request(app).get('/api/v1/')

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            message: 'Express API is running!',
            controller: 'Home',
        })
    })
})
