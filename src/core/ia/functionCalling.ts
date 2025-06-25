import { gemini } from './gemini';
import { executeFunctionsParallel } from './functionRegistry';
import { Content, FunctionDeclaration } from '@google/generative-ai';

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

// Create a new function calling context
export const createFunctionCallingContext = (): FunctionCallingContext => ({
  conversationHistory: []
});

// Reset conversation history
export const resetConversation = (context: FunctionCallingContext): void => {
  context.conversationHistory = [];
};

// Get current conversation history
export const getConversationHistory = (context: FunctionCallingContext): Content[] => {
  return [...context.conversationHistory];
};

// Main function calling processor
export const processWithFunctionCalling = async (
  userInput: string,
  systemPrompt: string,
  tools: FunctionDeclaration[],
  apiKey: string,
  context: FunctionCallingContext
): Promise<FunctionCallingResult> => {
  const functionsExecuted: FunctionExecutionResult[] = [];
  
  // Step 1: Send initial prompt with function definitions
  let response = await gemini({
    input: userInput,
    systemPrompt,
    tools,
    apiKey,
    conversationHistory: context.conversationHistory
  });
  
  // Add user input to conversation history
  context.conversationHistory.push({
    role: 'user',
    parts: [{ text: userInput }]
  });
  
  // Step 2: Check if function calls are needed
  if (response.functionCalls && response.functionCalls.length > 0) {
    const isParallelExecution = response.functionCalls.length > 1;
    
    console.log(`🔧 [FunctionCalling] ${isParallelExecution ? 'Parallel' : 'Single'} function execution detected`);
    console.log(`📋 [FunctionCalling] Functions to execute:`, response.functionCalls.map(fc => fc.name));
    
    // Add function calls to conversation history
    context.conversationHistory.push({
      role: 'model',
      parts: response.functionCalls.map(fc => ({
        functionCall: {
          name: fc.name,
          args: fc.args
        }
      }))
    });
    
    // Step 3: Execute functions (parallel or single)
    try {
      const executionResults = await executeFunctionsParallel(response.functionCalls);
      functionsExecuted.push(...executionResults);
      
      // Log execution results
      if (isParallelExecution) {
        console.log(`⚡ [FunctionCalling] Parallel execution completed:`);
        for (const result of executionResults) {
          const args = Object.entries(result.args)
            .map(([key, val]) => `${key}=${val}`)
            .join(', ');
          console.log(`  - ${result.name}(${args}) -> ${'error' in result ? `Error: ${result.error}` : 'Success'}`);
        }
      } else {
        const result = executionResults[0];
        const args = Object.entries(result.args)
          .map(([key, val]) => `${key}=${val}`)
          .join(', ');
        console.log(`🔧 [FunctionCalling] Function executed: ${result.name}(${args})`);
      }
      
      // Step 4: Send function results back to model
      context.conversationHistory.push({
        role: 'function',
        parts: executionResults.map(result => ({
          functionResponse: {
            name: result.name,
            response: 'error' in result ? { error: result.error } : result.result
          }
        }))
      });
      
      // Step 5: Get final response from model
      const finalResponse = await gemini({
        input: '', // Empty input since we're continuing conversation
        systemPrompt,
        tools,
        apiKey,
        conversationHistory: context.conversationHistory
      });
      
      // Add final response to history
      if (finalResponse.text) {
        context.conversationHistory.push({
          role: 'model',
          parts: [{ text: finalResponse.text }]
        });
      }
      
      return {
        finalResponse: finalResponse.text || 'Functions executed successfully',
        conversationHistory: context.conversationHistory,
        functionsExecuted,
        isParallelExecution
      };
      
    } catch (error) {
      console.error('❌ [FunctionCalling] Function execution error:', error);
      return {
        finalResponse: `Error executing functions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        conversationHistory: context.conversationHistory,
        functionsExecuted,
        isParallelExecution: response.functionCalls.length > 1
      };
    }
  }
  
  // No function calls needed, return direct response
  if (response.text) {
    context.conversationHistory.push({
      role: 'model',
      parts: [{ text: response.text }]
    });
  }
  
  return {
    finalResponse: response.text || 'No response generated',
    conversationHistory: context.conversationHistory,
    functionsExecuted,
    isParallelExecution: false
  };
};