import { createFunctionCalling } from './fnCalling';
import { gemini } from './gemini';
import { functionRegistry } from './fnCalling.registry';

// Create a singleton instance of the function calling service
// This can be imported and used throughout the application.
export const functionCallingService = createFunctionCalling(functionRegistry, gemini);