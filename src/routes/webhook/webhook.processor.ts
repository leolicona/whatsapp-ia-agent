import { DurableObject } from 'cloudflare:workers';
import {
  WebhookPayload as WhatsAppWebhookPayload,
  Message as WhatsAppMessage,
  Contact as WhatsAppContact,
  MessageValue,
  isWhatsAppWebhookPayload,
  isTextMessage,
  MessageProcessingResult
} from './webhook.schema';
import { CtaUrlInteractiveObject, CtaUrlMessagePayload } from '../../core/whatsapp/whatsApp.schema';
import { WhatsAppClient } from '../../core/whatsapp/whatsapp';
import { Env } from '../../bindings';
import { createFunctionCalling } from '../../core/ai/fnCalling';
import { functionRegistry } from '../../core/ai/fnCalling.registry';
import { gemini } from '../../core/ai/gemini';
import type { FunctionCallingContext } from '../../core/ai/ai.types';
import { cleanPhoneNumber } from '../../utils/utils';
import { allFunctionSchemas } from '../../core/ai/tools';




export class WebhookProcessor extends DurableObject {
  private readonly apiUrl: string;
  public readonly env: Env;
  private functionCallingContext: FunctionCallingContext;
  private readonly whatsAppClient: ReturnType<typeof WhatsAppClient>;
  private readonly functionCallingService: ReturnType<typeof createFunctionCalling>;

  constructor(ctx: DurableObjectState, env: Env) {
      super(ctx, env);
      this.env = env;
      console.log('🟣 [DoWaProcessMessages] Inicializando Durable Object');
      this.apiUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      this.whatsAppClient = WhatsAppClient({
        apiUrl: this.apiUrl,
        token: this.env.WHATSAPP_API_TOKEN,
      });
      
      // Create function calling service with environment context
       this.functionCallingService = createFunctionCalling(functionRegistry, gemini, this.env);
       this.functionCallingContext = this.functionCallingService.createContext();
  }

  async processWebhook(payload: WhatsAppWebhookPayload): Promise<MessageProcessingResult> {
    console.log('🚀 [WebhookProcessorDO] Received webhook event.', JSON.stringify(payload, null, 2));
    return this.processMessage(payload);
  }

  async getStatus() {
    return this.ctx.storage.get("processingStatus");
  }

  private async processMessage(payload: WhatsAppWebhookPayload): Promise<MessageProcessingResult> {
    console.log('➡️ [WebhookProcessorDO] Starting processMessage.', JSON.stringify(payload, null, 2));
    try {
        if (!isWhatsAppWebhookPayload(payload)) {
            console.error('❌ [WebhookProcessorDO] Invalid WhatsApp webhook payload structure');
            throw new Error('Invalid WhatsApp webhook payload structure');
        }
        const entry = payload.entry?.[0];
        const change = entry?.changes?.[0];
        
        
        if (change?.field !== 'messages') {
          console.warn('⚠️ [WebhookProcessorDO] Non-message event received, skipping processing.');
          return { status: 'success', message: 'Non-message event processed' };
        }

        const value = change.value as MessageValue;
        const message = value?.messages?.[0];
        const contact = value?.contacts?.[0];


        if (!message || !contact) {
            console.error('❌ [WebhookProcessorDO] Incomplete message data. Missing message or contact.');
            throw new Error('Incomplete message data');
        }

        console.log(`🔄 [WebhookProcessorDO] Processing message ID: ${message.id} from ${contact.wa_id}`);
        
        await this.ctx.storage.put("processingStatus", {
            status: "processing",
            timestamp: new Date().toISOString(),
            messageId: message.id,
            from: contact.wa_id,
            messageType: message.type
        });

        if (isTextMessage(message)) {
            console.log(`💬 [WebhookProcessorDO] Processing text message. Body: "${message.text.body}"`);
          
            await this.whatsAppClient.markMessageAsRead(message.id);
            await this.whatsAppClient.sendTypingIndicator(message.id);

            const phoneNumber = cleanPhoneNumber(contact.wa_id);
            console.log(`🔍 [WebhookProcessorDO] Searching for user with phone number: ${phoneNumber}`);
            

              // Process with AI using enhanced function calling
              const result = await this.functionCallingService.functionCalling(
                message.text.body,
                `You are a helpful smart home assistant that can control multiple devices simultaneously. 
                Available functions:
                - set_light_values: Control smart lights (brightness and color temperature)
                - set_thermostat: Control thermostat (temperature and mode)
                - control_music: Control music playback (play, pause, stop, volume)
                
                You can execute multiple functions in parallel when users request multiple actions.
                For example, if they say "turn on the lights, set temperature to 22°C and play music", 
                you should call all three functions simultaneously.
                Always respond in a friendly and helpful manner.`,
                allFunctionSchemas,
                this.env.GEMINI_API_KEY,
                this.functionCallingContext
              );

              let responseText = result.finalResponse;
              
              // Add execution details if functions were called
              if (result.functionsExecuted.length > 0) {
                const executionSummary = result.isParallelExecution 
                  ? `⚡ Executed ${result.functionsExecuted.length} functions in parallel:`
                  : `🔧 Executed function:`;
                  
                console.log(executionSummary);
                result.functionsExecuted.forEach(func => {
                  const args = Object.entries(func.args)
                    .map(([key, val]) => `${key}=${val}`)
                    .join(', ');
                  console.log(`  - ${func.name}(${args}) -> ${'error' in func ? `Error: ${func.error}` : 'Success'}`);
                });
              }

              console.log(`🤖 [WebhookProcessorDO] AI Response: ${responseText}`);
            
              await this.whatsAppClient.sendMessage(
                   phoneNumber,
                   {
                       type: "text",
                       text: {
                           body: responseText
                       }
                   }
               );
            
            
            console.log(`💾 [WebhookProcessorDO] Storing successful processing result for message: ${message.id}`);
            await this.ctx.storage.put(`message:${message.id}`, {
                messageId: message.id,
                from: contact.wa_id,
                messageType: message.type,
                processedAt: new Date().toISOString(),
                status: 'completed'
            });
        } else {
            console.warn(`🤷 [WebhookProcessorDO] Received non-text message type: ${message.type}. Skipping.`);
        }
    
        console.log(`✅ [WebhookProcessorDO] Webhook processing completed successfully for message ID: ${message.id}`);
        return { status: 'success', message: 'Webhook processed', messageId: message.id };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('💥 [WebhookProcessorDO] Error processing message:', {
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
}
