
import {
  GoogleGenAI,
  Content,
  FunctionCallingConfigMode,
} from '@google/genai';
import type {
  GeminiArgs,
  GeminiResponse
} from './ai.types';

export const gemini = async ({
  input,
  model = 'gemini-2.0-flash-001',
  systemPrompt,
  responseSchema,
  apiKey,
  tools,
  conversationHistory,
}: GeminiArgs): Promise<GeminiResponse> => {
  // Use conversation history if provided and not empty, otherwise create new content
  const contents: Content[] = conversationHistory && conversationHistory.length > 0 
    ? conversationHistory 
    : [{
        role: 'user',
        parts: [{ text: input }]
      }];

  const ai = new GoogleGenAI({ apiKey });

  // Build the config object for the new SDK
  const config: any = {
    systemInstruction: systemPrompt,
  };

  // Add generation config for JSON responses
  if (responseSchema) {
    config.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    };
  }

  // Add tools configuration
  if (tools && tools.length > 0) {
    config.tools = [{ functionDeclarations: tools }];
    config.toolConfig = {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.AUTO,
      },
    };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    
    // Check for function calls in all parts
    const functionCalls = parts
      .filter(part => 'functionCall' in part && part.functionCall)
      .map(part => ({
        name: part.functionCall!.name || '',
        args: part.functionCall!.args || {},
      }));
    
    if (functionCalls.length > 0) {
      return {
        functionCall: functionCalls[0], // Keep backward compatibility
        functionCalls,
        text: null,
      };
    }

    return {
      text: response.text || null,
      functionCall: null,
      functionCalls: null,
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Return a consistent error response or re-throw
    return {
      text: null,
      functionCall: null,
      functionCalls: null,
    };
  }
};
  
