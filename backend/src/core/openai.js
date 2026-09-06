import { OpenAI } from 'openai/client.js'

let client = null

export function getOpenAIClient() {
    if (client) return client

    if (!process.env.AI_API_KEY) {
        throw new Error('AI Provider API key is missing or invalid.')
    }

    client = new OpenAI({
        baseURL: process.env.AI_API_BASE_URL,
        apiKey: process.env.AI_API_KEY,
    })

    return client
}
