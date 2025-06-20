import { cleanPhoneNumber } from '../../utils/utils';
import { DurableObject } from 'cloudflare:workers';
import { 
  WhatsAppWebhookPayload, 
  isWhatsAppWebhookPayload,
  isTextMessage,
  MessageProcessingResult
} from '../../schemas/whatsapp.webhook.schema';
import { Env } from '../../bindings';


export class WebhookProcessor extends DurableObject {
  private readonly apiUrl: string;
  public readonly env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
      super(ctx, env);
      this.env = env;
      console.log('🟣 [DoWaProcessMessages] Inicializando Durable Object');
      this.apiUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  async processWebhook(payload: WhatsAppWebhookPayload): Promise<MessageProcessingResult> {
    console.log('📥 [DO] Recibiendo webhook payload en Durable Object');
    return this.processMessage(payload);
  }

  async getStatus() {
    return this.ctx.storage.get("processingStatus");
  }

  private async processMessage(payload: WhatsAppWebhookPayload): Promise<MessageProcessingResult> {
      console.log('🔄 [DO] Iniciando procesamiento del webhook payload');
     console.log("Ctx:", this.ctx)
     console.log("Env:", this.env)
      try {
          // Validate payload structure
          if (!isWhatsAppWebhookPayload(payload)) {
              throw new Error('Invalid WhatsApp webhook payload structure');
          }
            
          const entry = payload.entry?.[0];
          const change = entry?.changes?.[0];
          const value = change?.value;
          const message = value?.messages?.[0];
          const metadata = value?.metadata;
          const contact = value?.contacts?.[0];

          console.log('🔄 Durable Object processing webhook payload:', JSON.stringify(payload, null, 2));
          
          // Store processing status
          await this.ctx.storage.put("processingStatus", {
              status: "processing",
              timestamp: new Date().toISOString(),
              messageId: message?.id,
              from: contact?.wa_id,
              messageType: message?.type
          });

          // Process message if it's a text message
          if (message && contact && isTextMessage(message)) {
              console.log('📱 Processing text message from:', contact.wa_id);
            
              await this.markMessageAsRead(message.id)
              await this.sendTypingIndicator(message.id);
              
              await this.sendMessage(
                  cleanPhoneNumber(contact.wa_id),
                  {
                      type: "text",
                      text: {
                          body: message.text.body
                      }
                  }
              );
              
              // Store successful processing result
              await this.ctx.storage.put(`message:${message.id}`, {
                  messageId: message.id,
                  from: contact.wa_id,
                  messageType: message.type,
                  processedAt: new Date().toISOString(),
                  status: 'completed'
              });
          }
      
          console.log('✅ Webhook processing completed successfully');
          if (message) {
            return { status: 'success', message: 'Webhook processed', messageId: message.id };
          }
          return { status: 'success', message: 'Webhook processed' }; 
      } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('💥 [DO] Error procesando mensaje:', {
              error: errorMessage,
              payload: JSON.stringify(payload)
          });
          
          await this.ctx.storage.put("processingStatus", {
              status: "error",
              timestamp: new Date().toISOString(),
              error: errorMessage
          });

          return { status: 'error', message: errorMessage };
      }
  }

  async whatsAppApiRequest(body: object, method: string = 'POST'): Promise<Response> {
    const response = await fetch(this.apiUrl, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.env.WHATSAPP_API_TOKEN}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [DO] WhatsApp API error:`, errorText);
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async sendMessage(to: string, message: object): Promise<void> {
      const body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          ...message,
      };
      await this.whatsAppApiRequest(body);
  }

  async sendTypingIndicator(messageId: string): Promise<void> {
    const body = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: {
          type: "text"
        }
    };
    await this.whatsAppApiRequest(body);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const body = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
    };
    await this.whatsAppApiRequest(body);
  }
}




