import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  details?: any
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, {
    statusCode,
    message,
    details: err.details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
