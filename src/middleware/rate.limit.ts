import { WorkersKVStore } from '@hono-rate-limiter/cloudflare'
import { rateLimiter } from 'hono-rate-limiter'
import type { Context, Next } from 'hono'
import type { Env } from '../bindings'

interface RateLimitOptions {
  windowMs: number
  limit: number
}

export const createRateLimiter = (options: RateLimitOptions) => {
  return (c: Context<{ Bindings: Env }>, next: Next) =>
    rateLimiter<{ Bindings: Env }>({
      windowMs: options.windowMs,
      limit: options.limit,
      standardHeaders: 'draft-6', // Standard RateLimit-* headers
      keyGenerator: (c) => c.req.header('cf-connecting-ip') ?? 'unknown',
      store: new WorkersKVStore({ namespace: c.env.AUTH_KV }),
    })(c, next)
}

export const rateLimitPresets = {
  strict: createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 50 }),
  moderate: createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 100 }),
  lenient: createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 200 }),
  auth: createRateLimiter({ windowMs: 5 * 60 * 1000, limit: 10 }),
}