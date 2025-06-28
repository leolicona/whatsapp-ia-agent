import { FunctionDeclaration, Content } from '@google/genai';
import type {
  FunctionExecutionResult,
  FunctionCallingResult,
  FunctionCallingContext,
  FunctionRegistry,
  GeminiFunction
} from './ai.types';
import type { Env } from '../../bindings';

// Pure function utilities with environment context support
const executeFunction = (registry: FunctionRegistry, env?: Env) => (name: string, args: any) => {
  const fn = registry[name];
  if (!fn) throw new Error(`Function '${name}' not found`);
  
  // Check if function accepts environment parameter
  if (fn.length > Object.keys(args).length && env) {
    // Pass environment as additional parameter
    return fn(...Object.values(args), env);
  }
  
  return fn(...Object.values(args));
};

const executeFunctions = (registry: FunctionRegistry, env?: Env) => async (calls: Array<{ name: string; args: any }>) => {
  const executor = executeFunction(registry, env);
  const results = await Promise.allSettled(
    calls.map(async ({ name, args }) => ({
      name,
      args,
      result: await executor(name, args)
    }))
  );
  
  return results.map((result, i) => 
    result.status === 'fulfilled' 
      ? result.value 
      : { ...calls[i], result: null, error: String(result.reason) }
  );
};

// Message creation utilities
const createUserMessage = (text: string): Content => ({
  role: 'user',
  parts: [{ text }]
});

const createModelMessage = (text: string): Content => ({
  role: 'model',
  parts: [{ text }]
});

const createFunctionCallMessage = (calls: Array<{ name: string; args: any }>): Content => ({
  role: 'model',
  parts: calls.map(fc => ({ functionCall: { name: fc.name, args: fc.args } }))
});

const createFunctionResponseMessage = (results: FunctionExecutionResult[]): Content => ({
  role: 'function',
  parts: results.map(result => ({
    functionResponse: {
      name: result.name,
      response: 'error' in result ? { error: result.error } : result.result
    }
  }))
});

// Context management utilities
const addToHistory = (context: FunctionCallingContext) => (content: Content) => {
  context.conversationHistory.push(content);
};

const createContext = (): FunctionCallingContext => ({ conversationHistory: [] });

const resetConversation = (context: FunctionCallingContext) => {
  context.conversationHistory = [];
};

const getConversationHistory = (context: FunctionCallingContext) => [...context.conversationHistory];

// Core function calling pipeline
const processFunctionCalls = (executeAll: ReturnType<typeof executeFunctions>, addMessage: ReturnType<typeof addToHistory>) => 
  async (functionCalls: Array<{ name: string; args: any }>) => {
    addMessage(createFunctionCallMessage(functionCalls));
    const results = await executeAll(functionCalls);
    addMessage(createFunctionResponseMessage(results));
    return results;
  };

const createFinalResponse = (gemini: GeminiFunction, addMessage: ReturnType<typeof addToHistory>) => 
  async (systemPrompt: string, tools: FunctionDeclaration[], apiKey: string, conversationHistory: Content[]) => {
    const response = await gemini({
      input: '',
      systemPrompt,
      tools,
      apiKey,
      conversationHistory
    });
    
    if (response.text) {
      addMessage(createModelMessage(response.text));
    }
    
    return response.text || 'Functions executed successfully';
  };

const buildResult = (finalResponse: string, conversationHistory: Content[], functionsExecuted: FunctionExecutionResult[], isParallel: boolean): FunctionCallingResult => ({
  finalResponse,
  conversationHistory,
  functionsExecuted,
  isParallelExecution: isParallel
});

export const createFunctionCalling = (
  functionRegistry: FunctionRegistry,
  gemini: GeminiFunction,
  env?: Env
) => {
  const executeAll = executeFunctions(functionRegistry, env);
  
  const functionCalling = async (
    userInput: string,
    systemPrompt: string,
    tools: FunctionDeclaration[],
    apiKey: string,
    context: FunctionCallingContext
  ): Promise<FunctionCallingResult> => {
    const addMessage = addToHistory(context);
    const processFunctions = processFunctionCalls(executeAll, addMessage);
    const allExecutedFns: FunctionExecutionResult[] = [];
    const MAX_TURNS = 5;
    let turnCount = 0;

    addMessage(createUserMessage(userInput));

    try {
      while (turnCount < MAX_TURNS) {
        turnCount++;

        const response = await gemini({
          input: '', // Input is now managed via history
          systemPrompt,
          tools,
          apiKey,
          conversationHistory: context.conversationHistory,
        });

        if (response.functionCalls?.length) {
          const executedFns = await processFunctions(response.functionCalls);
          allExecutedFns.push(...executedFns);
          // Continue to the next iteration to see what the AI does next
          continue;
        }

        if (response.text) {
          addMessage(createModelMessage(response.text));
          return buildResult(
            response.text,
            context.conversationHistory,
            allExecutedFns,
            allExecutedFns.length > 1
          );
        }

        // If we get here, the AI didn't return text or a function call
        return buildResult(
          'No response generated',
          context.conversationHistory,
          allExecutedFns,
          false
        );
      }

      // Handle loop exit due to MAX_TURNS
      return buildResult(
        'Exceeded maximum function calling turns.',
        context.conversationHistory,
        allExecutedFns,
        false
      );
    } catch (error) {
      return buildResult(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context.conversationHistory,
        allExecutedFns,
        false
      );
    }
  };
  
  return {
    createContext,
    resetConversation,
    getConversationHistory,
    functionCalling
  };
};