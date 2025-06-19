import { Hono } from 'hono'
import type { Env } from './bindings'
import { corsMiddleware } from './middleware/cors'
import { securityHeaders } from './middleware/security.headers'
import { rateLimitPresets } from './middleware/rate.limit'
import { globalErrorHandler } from './middleware/error.handler'
import { auth } from './routes/auth'

const app = new Hono<{ Bindings: Env }>()

// Global error handler - must be set before other middleware
app.onError(globalErrorHandler)

// Apply security headers middleware globally
app.use('*', securityHeaders())

// Apply CORS middleware globally
app.use('*', corsMiddleware)

// Apply rate limiting to all routes
app.use('*', rateLimitPresets.moderate)

// Mount auth routes
app.route('/auth', auth)

// Basic routes
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'OTPless Auth Service API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (c) => {
  return c.json({ 
    success: true,
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  })
})

export default app
