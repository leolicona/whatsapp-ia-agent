

type WhatsAppConfig = {
  apiUrl: string;
  token: string;
};
export const makeApiRequester = (config: WhatsAppConfig) =>
  async (body: object, method: string = 'POST'): Promise<Response> => {
    const response = await fetch(config.apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Side effect: Logging errors to the console
      console.error(`❌ WhatsApp API error:`, errorText);
      throw new Error(`WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response;
  };
