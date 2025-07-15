import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { embeddings } from '../../embeddings/embeddings.service';
import { ToolResponse } from '../ai.types';

interface SearchSimilarTextData {
  context: string;
}

export const searchSimilarText = async ({ text, env }: { text: string; env: Env }): Promise<ToolResponse<SearchSimilarTextData>> => {
  console.log(`🔍 [searchSimilarText] Searching for similarities with text: "${text}"`);
  
  try {
    // Initialize embeddings service with environment configuration
    const embeddingsService = embeddings({
      apiKey: env.GEMINI_API_KEY,
      vectorize: env.VECTORIZE,
    });

    console.log('🚀 Embeddings service initialized successfully');

    // Create vector from the input text
    const vectorResult = await embeddingsService.createVectors(text);
    console.log('📊 Vector created:', vectorResult.embeddings.length, 'dimensions');

    // Search for similar vectors (top 5 results)
    const searchResults = await embeddingsService.matchVectors({
      queryVector: vectorResult.embeddings,
      topK: 2,
    });

    console.log('🎯 Search results found:', searchResults.matches.length, 'matches');
    console.log('📋 Detailed results:', JSON.stringify(searchResults.matches, null, 2));

    // Extract and combine metadata content from all matches
    const metadataContent = searchResults.matches
      .map(match => match.metadata?.content)
      .filter(content => content !== undefined)
      .join(' ');
    
    console.log('📝 Extracted metadata content:', metadataContent);

    return {
      status: 'success',
      message: 'Similar text found.',
      data: {
        context: metadataContent,
      },
    }
  } catch (error) {
    console.error('❌ Error in searchSimilarText:', error);
    return {
      status: 'failure',
      message: `Error searching for similar text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: {
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      data: {
        context: text,
      }
    };
  }
};

export const searchSimilarTextSchema = {
  name: 'searchSimilarText',
  description: 'Retrieves specific, up-to-date information from the Serenity Health Clinic\'s knowledge base. Use this tool to answer any user questions about the clinic, including its services, hours, location, appointment policies, doctors, and billing.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'The user\'s original question or a concise summary of the information they are looking for. This will be used to search the knowledge base for the most relevant context. Example: \'What do I need to bring for my first appointment?\'',
      },
    },
    required: ['text'],
  },
};