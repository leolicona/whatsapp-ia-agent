// Houses data validation schemas for WhatsApp webhook request bodies and parameters
import { z } from 'zod'

// Schema for WhatsApp webhook verification (GET request)
export const webhookVerificationSchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string().optional()
})

// Schema for text message content
const textMessageSchema = z.object({
  body: z.string()
})

// Schema for media message content
const mediaMessageSchema = z.object({
  id: z.string(),
  mime_type: z.string().optional(),
  sha256: z.string().optional(),
  caption: z.string().optional()
})

// Schema for location message content
const locationMessageSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().optional(),
  address: z.string().optional()
})

// Schema for contact message content
const contactMessageSchema = z.object({
  formatted_name: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  birthday: z.string().optional(),
  phones: z.array(z.object({
    phone: z.string(),
    wa_id: z.string().optional(),
    type: z.string().optional()
  })).optional(),
  emails: z.array(z.object({
    email: z.string(),
    type: z.string().optional()
  })).optional(),
  urls: z.array(z.object({
    url: z.string(),
    type: z.string().optional()
  })).optional()
})

// Schema for interactive message content (buttons, lists)
const interactiveMessageSchema = z.object({
  type: z.enum(['button_reply', 'list_reply']),
  button_reply: z.object({
    id: z.string(),
    title: z.string()
  }).optional(),
  list_reply: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional()
  }).optional()
})

// Schema for message context (replies)
const messageContextSchema = z.object({
  from: z.string(),
  id: z.string(),
  forwarded: z.boolean().optional(),
  frequently_forwarded: z.boolean().optional()
})

// Schema for individual message
const messageSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.enum([
    'text',
    'image',
    'audio',
    'video',
    'document',
    'sticker',
    'location',
    'contacts',
    'interactive',
    'button',
    'order',
    'system',
    'unknown'
  ]),
  context: messageContextSchema.optional(),
  text: textMessageSchema.optional(),
  image: mediaMessageSchema.optional(),
  audio: mediaMessageSchema.optional(),
  video: mediaMessageSchema.optional(),
  document: mediaMessageSchema.optional(),
  sticker: mediaMessageSchema.optional(),
  location: locationMessageSchema.optional(),
  contacts: z.array(contactMessageSchema).optional(),
  interactive: interactiveMessageSchema.optional(),
  button: z.object({
    text: z.string(),
    payload: z.string()
  }).optional(),
  order: z.object({
    catalog_id: z.string(),
    text: z.string(),
    product_items: z.array(z.object({
      product_retailer_id: z.string(),
      quantity: z.number(),
      item_price: z.number(),
      currency: z.string()
    }))
  }).optional(),
  system: z.object({
    body: z.string(),
    type: z.string()
  }).optional(),
  errors: z.array(z.object({
    code: z.number(),
    title: z.string(),
    message: z.string().optional(),
    error_data: z.object({
      details: z.string()
    }).optional()
  })).optional()
})

// Schema for contact information
const contactSchema = z.object({
  profile: z.object({
    name: z.string()
  }),
  wa_id: z.string()
})

// Schema for message status
const messageStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  timestamp: z.string(),
  recipient_id: z.string(),
  conversation: z.object({
    id: z.string(),
    expiration_timestamp: z.string().optional(),
    origin: z.object({
      type: z.string()
    })
  }).optional(),
  pricing: z.object({
    billable: z.boolean(),
    pricing_model: z.string(),
    category: z.string()
  }).optional(),
  errors: z.array(z.object({
    code: z.number(),
    title: z.string(),
    message: z.string().optional(),
    error_data: z.object({
      details: z.string()
    }).optional()
  })).optional()
})

// Schema for message value (contains messages, contacts, statuses)
const messageValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string()
  }),
  contacts: z.array(contactSchema).optional(),
  messages: z.array(messageSchema).optional(),
  statuses: z.array(messageStatusSchema).optional()
})

// Schema for template status update
const templateStatusSchema = z.object({
  event: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'PAUSED']),
  message_template_id: z.string(),
  message_template_name: z.string(),
  message_template_language: z.string(),
  reason: z.string().optional(),
  other_info: z.object({
    title: z.string().optional(),
    body: z.string().optional()
  }).optional()
})

// Schema for webhook change
const webhookChangeSchema = z.object({
  field: z.enum(['messages', 'message_template_status_update']),
  value: z.union([messageValueSchema, templateStatusSchema])
})

// Schema for webhook entry
const webhookEntrySchema = z.object({
  id: z.string(),
  changes: z.array(webhookChangeSchema)
})

// Main schema for WhatsApp webhook payload (POST request)
export const webhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(webhookEntrySchema)
})

// Schema for webhook query parameters (verification)
export const webhookQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge': z.string().optional()
})

// Export types for TypeScript
export type WebhookVerification = z.infer<typeof webhookVerificationSchema>
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>
export type WebhookQuery = z.infer<typeof webhookQuerySchema>
export type Message = z.infer<typeof messageSchema>
export type MessageStatus = z.infer<typeof messageStatusSchema>
export type Contact = z.infer<typeof contactSchema>
export type TemplateStatus = z.infer<typeof templateStatusSchema>

// Validation schemas for different webhook scenarios
export const webhookSchemas = {
  verification: webhookVerificationSchema,
  payload: webhookPayloadSchema,
  query: webhookQuerySchema
} as const