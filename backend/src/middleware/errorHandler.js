import { ZodError } from 'zod'

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: error.issues[0]?.message || 'Invalid request',
        code: 'VALIDATION_ERROR',
      },
    })
  }

  console.error(error)

  return res.status(error.status || 500).json({
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
    },
  })
}
