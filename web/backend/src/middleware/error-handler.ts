import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : 'Internal server error.'

  console.error('Unhandled application error:', error)

  response.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
  })
}
