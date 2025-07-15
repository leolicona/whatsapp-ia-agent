import type {
  FunctionDeclaration,
  Content,
  Schema,
} from '@google/genai';

// Gemini API related schemas
export interface GeminiArgs {
  apiKey: string;
  input: string; // Simple string input that will be converted to Content[]
  model?: string;
  systemInstruction: string;
  responseSchema?: Schema;
  tools?: FunctionDeclaration[];
  conversationHistory?: Content[]; // Support for conversation history
}

export interface FunctionCallResponse {
  name: string;
  args: Record<string, any>;
}

export interface GeminiResponse {
  text: string | null;
  functionCall: FunctionCallResponse | null;
  functionCalls: FunctionCallResponse[] | null; // Support for parallel function calling
}

// Function calling related schemas
export interface FunctionExecutionResult {
  name: string;
  args: Record<string, any>;
  result: any;
  error?: string;
}

export interface FunctionCallingResult {
  finalResponse: string;
  conversationHistory: Content[];
  functionsExecuted: FunctionExecutionResult[];
  isParallelExecution: boolean;
}

export interface FunctionCallingContext {
  conversationHistory: Content[];
}

export interface FunctionRegistry {
  [key: string]: (params: any) => Promise<any>;
}

export interface GeminiFunction {
  (params: {
    input: string;
    systemPrompt: string;
    tools: FunctionDeclaration[];
    apiKey: string;
    conversationHistory: Content[];
  }): Promise<GeminiResponse>;
}

// Tool specific schemas
export interface LightValues {
  brightness: number;
  color_temp: string;
}

export interface ThermostatSettings {
  temperature: number;
  mode: string;
  status: string;
}

export interface MusicControl {
  action: string;
  volume?: number;
  status: string;
}

export interface ToolResponse<T> {
  status: 'success' | 'failure' | 'no_data' | 'partial_success';
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
