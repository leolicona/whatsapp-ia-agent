import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import type { Env } from '../bindings'

/**
 * Standard error response interface
 */
interface ErrorResponse {
  success: false
  error: string
  message: string
  timestamp: string
  requestId?: string
  details?: any
}

/**
 * Global error handler for the Hono application
 * Handles HTTPException, ZodError, and unexpected errors
 */
export const globalErrorHandler = (err: Error | HTTPException | ZodError, c: Context<{ Bindings: Env }>) => {
  console.error('=== Global Error Handler ====')
  console.error('Error:', err.message)
  console.error('Stack:', err.stack)
  console.error('Request URL:', c.req.url)
  console.error('Request Method:', c.req.method)
  
  const timestamp = new Date().toISOString()
  const requestId = c.req.header('cf-ray') || crypto.randomUUID()
  
  // Handle HTTPException (controlled API errors)
  if (err instanceof HTTPException) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'HTTP_EXCEPTION',
      message: err.message,
      timestamp,
      requestId
    }
    
    // Error logged to Cloudflare's native logging system
    
    return c.json(errorResponse, err.status)
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      timestamp,
      requestId,
      details: err.flatten().fieldErrors
    }
    
    return c.json(errorResponse, 400)
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'AUTHENTICATION_ERROR',
      message: 'Invalid or expired token',
      timestamp,
      requestId
    }
    
    return c.json(errorResponse, 401)
  }
  
  // Handle rate limit errors
  if (err.message.includes('Rate limit exceeded')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      timestamp,
      requestId
    }
    
    return c.json(errorResponse, 429)
  }
  
  // Handle unexpected errors
  console.error('Unexpected error:', err)
  
  // Error logged to Cloudflare's native logging system
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp,
    requestId
  }
  
  return c.json(errorResponse, 500)
}



/**
 * Creates an HTTPException with consistent formatting
 */
export const createHTTPException = (status: number, message: string, cause?: Error): HTTPException => {
  return new HTTPException(status as any, { message, cause })
}

/**
 * Common HTTP exceptions for the auth service
 */
export const AuthErrors = {
  INVALID_CREDENTIALS: () => createHTTPException(401, 'Invalid credentials provided'),
  TOKEN_EXPIRED: () => createHTTPException(401, 'Authentication token has expired'),
  TOKEN_INVALID: () => createHTTPException(401, 'Invalid authentication token'),
  INSUFFICIENT_PERMISSIONS: () => createHTTPException(403, 'Insufficient permissions to access this resource'),
  USER_NOT_FOUND: () => createHTTPException(404, 'User not found'),
  USER_ALREADY_EXISTS: () => createHTTPException(409, 'User already exists'),
  RATE_LIMIT_EXCEEDED: () => createHTTPException(429, 'Rate limit exceeded. Please try again later'),
  OTPLESS_API_ERROR: (message?: string) => createHTTPException(502, message || 'OTPless API error'),
  DATABASE_ERROR: () => createHTTPException(503, 'Database temporarily unavailable')
} as const