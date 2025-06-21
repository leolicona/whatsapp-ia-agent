// This file defines the Hono router for WhatsApp webhook endpoints
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { webhookHandlers } from './webhook.handler'
import type { Env } from '../../bindings'

const webhook = new Hono<{ Bindings: Env }>

webhook.get('/', async (c) => {
  try {
    return await webhookHandlers.verifyWebhook(c)
  } catch (error) {
    console.error('Webhook verification error:', error)
    throw new HTTPException(400, { message: 'Invalid webhook verification request' })
  } 
})

webhook.post('/', async (c) => {
  try {
    return await webhookHandlers.handleWebhookEvent(c)
  } catch (error) {
    console.error('Webhook processing error:', error)
    throw new HTTPException(400, { message: 'Invalid webhook processing request' })
  }
})

export { webhook }