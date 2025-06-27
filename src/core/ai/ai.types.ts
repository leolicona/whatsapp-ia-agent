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
  systemPrompt: string;
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
  [key: string]: (...args: any[]) => any;
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
}

export interface MusicControl {
  action: string;
  volume?: number;
  track?: string;
}