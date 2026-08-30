import { ZodError } from 'zod'

export function responseError(response, error) {
    if (error instanceof ZodError) {
        return response.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.flatten().fieldErrors,
        })
    }

    return response.status(500).json({
        success: false,
        message: error.toString(),
    })
}
