import { FunctionDeclaration, Content } from '@google/generative-ai';
import type {
  FunctionExecutionResult,
  FunctionCallingResult,
  FunctionCallingContext,
  GeminiResponse,
  FunctionRegistry,
  GeminiFunction
} from './ai.types';

export const createFunctionCalling = (
  functionRegistry: FunctionRegistry,
  gemini: GeminiFunction
) => {
  const executeFunction = (name: string, args: any) => {
    const fn = functionRegistry[name];
    if (!fn) throw new Error(`Function '${name}' not found`);
    
    // Map function names to their parameter extraction logic
    switch (name) {
      case 'set_light_values':
        return fn(args.brightness, args.color_temp);
      case 'set_thermostat':
        return fn(args.temperature, args.mode);
      case 'control_music':
        return fn(args.action, args.volume);
      default:
        // Fallback for any other functions - pass args as single parameter
        return fn(args);
    }
  };

  const executeFunctionsParallel = async (calls: Array<{ name: string; args: any }>) =>
    Promise.allSettled(
      calls.map(async ({ name, args }) => ({
        name,
        args,
        result: await executeFunction(name, args),
      }))
    ).then(results =>
      results.map((result, i) =>
        result.status === 'fulfilled'
          ? result.value
          : { ...calls[i], result: null, error: String(result.reason) }
      )
    );

  const createContext = (): FunctionCallingContext => ({
    conversationHistory: []
  });

  const resetConversation = (context: FunctionCallingContext): void => {
    context.conversationHistory = [];
  };

  const getConversationHistory = (context: FunctionCallingContext): Content[] => {
    return [...context.conversationHistory];
  };

  const functionCalling = async (
    userInput: string,
    systemPrompt: string,
    tools: FunctionDeclaration[],
    apiKey: string,
    context: FunctionCallingContext
  ): Promise<FunctionCallingResult> => {
    const functionsExecuted: FunctionExecutionResult[] = [];
    
    let response = await gemini({
      input: userInput,
      systemPrompt,
      tools,
      apiKey,
      conversationHistory: context.conversationHistory
    });
    
    context.conversationHistory.push({
      role: 'user',
      parts: [{ text: userInput }]
    });
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const isParallelExecution = response.functionCalls.length > 1;
      
      console.log(`🔧 [FunctionCalling] ${isParallelExecution ? 'Parallel' : 'Single'} function execution detected`);
      console.log(`📋 [FunctionCalling] Functions to execute:`, response.functionCalls.map(fc => fc.name));
      
      context.conversationHistory.push({
        role: 'model',
        parts: response.functionCalls.map(fc => ({
          functionCall: {
            name: fc.name,
            args: fc.args
          }
        }))
      });
      
      try {
        const executionResults = await executeFunctionsParallel(response.functionCalls);
        functionsExecuted.push(...executionResults);
        
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
        
        context.conversationHistory.push({
          role: 'function',
          parts: executionResults.map(result => ({
            functionResponse: {
              name: result.name,
              response: 'error' in result ? { error: result.error } : result.result
            }
          }))
        });
        
        const finalResponse = await gemini({
          input: '',
          systemPrompt,
          tools,
          apiKey,
          conversationHistory: context.conversationHistory
        });
        
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

  return {
    createContext,
    resetConversation,
    getConversationHistory,
    functionCalling
  };
};