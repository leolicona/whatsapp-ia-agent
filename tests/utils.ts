import type { Hono } from 'hono'

export const createTestRequest = (path: string, method: string = 'GET', body?: any) => {
  const url = `http://localhost${path}`
  const options: RequestInit = { method }
  
  if (body) {
    options.body = JSON.stringify(body)
    options.headers = {
      'Content-Type': 'application/json',
    }
  }
  
  return new Request(url, options)
}

export const testApp = async (app: Hono, request: Request) => {
  return await app.request(request)
}