import { OpenAI } from 'openai/client.js'

if (!process.env.AI_API_KEY) {
    throw new Error('AI Provider API key is missing or invalid.')
}

export const openai = new OpenAI({
    baseURL: process.env.AI_API_BASE_URL,
    apiKey: process.env.AI_API_KEY,
})
