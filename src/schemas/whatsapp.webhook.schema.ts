/**
 * WhatsApp Business API Webhook Payload Types
 * Based on the official WhatsApp Business API webhook structure
 */

// Base contact information
export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

// Message text content
export interface WhatsAppTextMessage {
  body: string;
}

// Base message structure
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive' | 'button' | 'order' | 'system';
  text?: WhatsAppTextMessage;
  // Additional message types can be added here as needed
  // image?: WhatsAppImageMessage;
  // audio?: WhatsAppAudioMessage;
  // etc.
}

// Metadata for the phone number
export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

// Value object containing the main webhook data
export interface WhatsAppWebhookValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: any[]; // For message status updates
}

// Individual change in the webhook
export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: 'messages' | 'message_status' | 'contacts';
}

// Entry containing changes
export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

// Main webhook payload structure
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

// Type guards for runtime type checking
export const isWhatsAppWebhookPayload = (payload: any): payload is WhatsAppWebhookPayload => {
  return (
    payload &&
    typeof payload === 'object' &&
    payload.object === 'whatsapp_business_account' &&
    Array.isArray(payload.entry)
  );
};

export const isTextMessage = (message: WhatsAppMessage): message is WhatsAppMessage & { text: WhatsAppTextMessage } => {
  return message.type === 'text' && !!message.text;
};

// Helper type for extracting messages from webhook payload
export type ExtractedMessage = {
  entryId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  message: WhatsAppMessage;
  contact?: WhatsAppContact;
};

// Helper type for message processing
export type MessageProcessingResult = {
  status: 'success' | 'error';
  message: string;
  messageId?: string;
};