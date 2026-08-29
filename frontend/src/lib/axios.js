import axios from 'axios'

const apiClient = axios.create({
    baseURL: import.meta.env.DEV ? import.meta.env.VITE_BACKEND_API_BASE_URL : '/api',
    headers: {
        'Content-Type': 'application/json',
        ...(import.meta.env.DEV && { apikey: import.meta.env.VITE_API_KEY }),
    },
})

export default apiClient
