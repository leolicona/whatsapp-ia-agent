import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Hono App', () => {
  it('should return Hello Hono! on GET /', async () => {
    const req = new Request('http://localhost/', {
      method: 'GET',
    })
    
    const res = await app.request(req)
    const text = await res.text()
    
    expect(res.status).toBe(200)
    expect(text).toBe('Hello Hono!')
  })

  it('should handle 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown', {
      method: 'GET',
    })
    
    const res = await app.request(req)
    
    expect(res.status).toBe(404)
  })
})