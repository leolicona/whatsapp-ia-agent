import { Hono } from 'hono'
import type { Env } from './bindings'
import { corsMiddleware } from './middleware/cors'
import { securityHeaders } from './middleware/security.headers'
import { rateLimitPresets } from './middleware/rate.limit'

const app = new Hono<{ Bindings: Env }>()

// Apply security headers middleware globally
app.use('*', securityHeaders())

// Apply CORS middleware globally
app.use('*', corsMiddleware)

// Apply rate limiting
app.use('/api/*', rateLimitPresets.moderate)
app.use('/api/auth/*', rateLimitPresets.auth)

// Auth routes
app.get('/api/auth', (c) => {
  return c.text('Hello Hono!')
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})



export default app
