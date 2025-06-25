
import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  Content,
} from '@google/generative-ai';

import type { Schema } from '@google/generative-ai';

interface GeminiArgs {
  apiKey: string;
  input: string; // Simple string input that will be converted to Content[]
  model?: string;
  systemPrompt: string;
  responseSchema?: Schema;
  tools?: FunctionDeclaration[];
  conversationHistory?: Content[]; // Support for conversation history
}

interface FunctionCallResponse {
  name: string;
  args: Record<string, any>;
}

interface GeminiResponse {
  text: string | null;
  functionCall: FunctionCallResponse | null;
  functionCalls: FunctionCallResponse[] | null; // Support for parallel function calling
}

export const gemini = async ({
  input,
  model = 'gemini-2.5-flash-lite-preview-06-17',
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

  const genAI = new GoogleGenerativeAI(apiKey);

  const generationConfig = responseSchema
    ? {
        responseMimeType: 'application/json' as const,
        responseSchema: responseSchema,
      }
    : undefined;

  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig,
    systemInstruction: systemPrompt,
    tools: tools ? [{ functionDeclarations: tools }] : undefined,
  });

  try {
    const result = await generativeModel.generateContent({ contents });

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    // Check for function calls in all parts
    const functionCalls = parts
      .filter(part => 'functionCall' in part && part.functionCall)
      .map(part => ({
        name: part.functionCall!.name,
        args: part.functionCall!.args,
      }));
    
    if (functionCalls.length > 0) {
      return {
        functionCall: functionCalls[0], // Keep backward compatibility
        functionCalls,
        text: null,
      };
    }

    return {
      text: response.text(),
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
  
