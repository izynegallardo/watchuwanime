const ALLOWED_ROUTES = {
    '': ['GET'],
    'anime/recommend': ['POST'],
}

export default async function handler(request, response) {
    const segments = Array.isArray(request.query.path) ? request.query.path : []
    const path = segments.join('/')

    const allowedMethods = ALLOWED_ROUTES[path]

    if (!allowedMethods) {
        return response.status(404).json({
            success: false,
            message: 'Not found',
        })
    }

    if (!allowedMethods.includes(request.method)) {
        return response.status(405).json({
            success: false,
            message: 'Method not allowed',
        })
    }

    const backendUrl = `${process.env.BACKEND_API_BASE_URL}/${path}`

    try {
        const backendResponse = await fetch(backendUrl, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
                apikey: process.env.BACKEND_API_KEY,
            },
            body: request.method === 'GET' ? undefined : JSON.stringify(request.body),
            signal: AbortSignal.timeout(15000),
        })

        const data = await backendResponse.json()

        return response.status(backendResponse.status).json(data)
    } catch {
        return response.status(502).json({
            success: false,
            message: 'Proxy error',
        })
    }
}
