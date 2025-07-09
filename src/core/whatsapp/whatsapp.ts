import { 
  CtaUrlInteractiveObject, 
  CtaUrlMessagePayload, 
  CtaUrlMessagePayloadSchema,
  WhatsAppConfig
} from './whatsApp.schema';
import { makeApiRequester } from '../makeApiRequester';

const WhatsAppClient = (config: WhatsAppConfig) => {
 
   const apiRequest  = makeApiRequester({baseUrl: config.apiUrl, token: config.token});

  return {
    sendMessage: async (to: string, message: object): Promise<void> => {
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        ...message,
      };
      await apiRequest.post('', body);
    },

    sendCtaUrlMessage: async (to: string, interactive: CtaUrlInteractiveObject): Promise<void> => {
      const body: CtaUrlMessagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      };

      CtaUrlMessagePayloadSchema.parse(body);
      await apiRequest.post('', body);
    },

    sendTypingIndicator: async (messageId: string): Promise<void> => {
      const body = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: {
          type: 'text'
        }
      };
      await apiRequest.post('', body);
    },

    markMessageAsRead: async (messageId: string): Promise<void> => {
      const body = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      };
      await apiRequest.post('', body);
    },
  };
};

export { WhatsAppClient, type WhatsAppConfig };