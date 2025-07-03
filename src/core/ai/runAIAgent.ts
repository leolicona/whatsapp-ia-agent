import { genAi } from "./genAi";
import { FunctionDeclaration, Content } from '@google/genai';
import type {
  FunctionExecutionResult,
  FunctionCallingResult,
  FunctionCallingContext
} from './ai.types';
import { functionRegistry } from './fnCalling.registry';
import type { Env } from '../../bindings';

const CONFIG = {
  MAX_TURNS: 5,
  DEFAULT_COMPLETION_MESSAGE: 'I have completed the requested actions.'
} as const;

interface RunAIAgentParams {
  input: string;
  systemInstruction: string;
  tools: FunctionDeclaration[];
  apiKey: string;
  conversationHistory: Content[];
  env?: Env;
}

/**
 * Main AI agent that handles tool execution and conversation flow
 */
export const runAIAgent = async ({
  input,
  systemInstruction,
  tools,
  apiKey,
  conversationHistory,
  env
}: RunAIAgentParams): Promise<FunctionCallingResult> => {
  const executedFunctions: FunctionExecutionResult[] = [];
  const history = [...conversationHistory]; // Working copy of conversation
  
  try {
    // Main conversation loop - up to MAX_TURNS
    let turn = 0;
    while (turn < CONFIG.MAX_TURNS) {
      const response = await genAi({
        input,
        systemInstruction,
        tools,
        apiKey,
        conversationHistory: history,
      });
      
      // If AI wants to call functions, execute them
      if (response.functionCalls?.length) {
        const results = await executeFunctions(response.functionCalls, env);
        executedFunctions.push(...results);
        updateHistory(history, response.functionCalls, results);
        turn++;
        continue; // Let AI process function results
      }
      
      // If AI provides a text response, we're done
      if (response.text) {
        return createFinalResult(response.text, history, executedFunctions);
      }
      
      // No response - break and generate summary
      break;
    }
    
    // Generate summary if no direct response was provided
    const summaryText = await getSummaryText({
      executedFunctions,
      systemInstruction,
      tools,
      apiKey,
      history
    });
    
    return createFinalResult(summaryText, history, executedFunctions);
    
  } catch (error) {
    const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return createFinalResult(errorMessage, history, executedFunctions);
  }
};

/**
 * Execute multiple functions in parallel
 */
async function executeFunctions(
  functionCalls: Array<{ name: string; args: any }>,
  env?: Env
): Promise<FunctionExecutionResult[]> {
   const results = await Promise.allSettled(
    functionCalls.map(async ({ name, args }) => {
      const fn = functionRegistry[name as keyof typeof functionRegistry] as Function;
      if (!fn) {
        throw new Error(`Function '${name}' not found in registry`);
      }
      
      const argValues = Object.values(args);
      const needsEnv = fn.length > argValues.length && env;
      const result = await fn(...argValues, ...(needsEnv ? [env] : []));
      
      return { name, args, result };
    })
  );

  // Convert settled promises to results
  return results.map((result, index) => 
    result.status === 'fulfilled' 
      ? result.value
      : { ...functionCalls[index], result: null, error: String(result.reason) }
  );
}

/**
 * Update conversation history with function calls and responses
 */
function updateHistory(
  history: Content[],
  functionCalls: Array<{ name: string; args: any }>,
  results: FunctionExecutionResult[]
): void {
  // Add AI's function calls
  history.push({
    role: 'model',
    parts: functionCalls.map(fc => ({
      functionCall: { name: fc.name, args: fc.args }
    }))
  });
  
  // Add function responses
  history.push({
    role: 'function',
    parts: results.map(result => ({
      functionResponse: {
        name: result.name,
        response: 'error' in result ? { error: result.error } : result.result
      }
    }))
  });
}

/**
 * Create final result object
 */
function createFinalResult(
  text: string,
  history: Content[],
  executedFunctions: FunctionExecutionResult[]
): FunctionCallingResult {
  // Add final response to history
  history.push({
    role: 'model',
    parts: [{ text }]
  });
  
  return {
    finalResponse: text,
    conversationHistory: history,
    functionsExecuted: executedFunctions,
    isParallelExecution: executedFunctions.length > 1
  };
}

/**
 * Generate summary text when no direct response was provided
 */
async function getSummaryText(params: {
  executedFunctions: FunctionExecutionResult[];
  systemInstruction: string;
  tools: FunctionDeclaration[];
  apiKey: string;
  history: Content[];
}): Promise<string> {
  const { executedFunctions, systemInstruction, tools, apiKey, history } = params;
  
  // If no functions were executed, return default message
  if (!executedFunctions.length) {
    return CONFIG.DEFAULT_COMPLETION_MESSAGE;
  }
  
  // Create a concise summary of executed functions
  const summary = executedFunctions
    .map(fn => `${fn.name}: ${JSON.stringify(fn.result)}`)
    .join(', ');
  
  // Ask AI to summarize what was accomplished
  const response = await genAi({
    input: `Summarize what was accomplished: ${summary}`,
    systemInstruction,
    tools,
    apiKey,
    conversationHistory: history
  });
  
  return response.text || CONFIG.DEFAULT_COMPLETION_MESSAGE;
}
