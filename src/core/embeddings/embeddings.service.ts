import { GoogleGenAI } from '@google/genai';
import { MatchVectorParams, StoreVectorParams, EmbeddingsConfig } from './embeddings.types';



export const embeddings = (config: EmbeddingsConfig) => {

    return {
        createVectors: async (text: string) => {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const result = await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: text,
                config: {
                    taskType: 'SEMANTIC_SIMILARITY',
                }
            });
            
            // Extract the actual embedding values from the response
            if (!result.embeddings || result.embeddings.length === 0) {
                throw new Error('No embeddings returned from Google GenAI API');
            }
            
            const embedding = result.embeddings[0];
            if (!embedding || !embedding.values) {
                throw new Error('Invalid embedding structure returned from Google GenAI API');
            }
            
            return {
                embeddings: embedding.values
            };
        },

        matchVectors: async ({
            queryVector,
            topK = 1,
        }: MatchVectorParams) => {
            return await config.vectorize.query(queryVector, {
                topK,
                returnValues: true,
                returnMetadata: 'all'
            });
        },

        storeVectors: async ({ vectors }: StoreVectorParams) => {
            try {
                const inserted = await config.vectorize.upsert(vectors);
                return inserted;
            } catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Failed to upsert vectors: ${error.message}`);
                }
                throw new Error('Failed to upsert vectors: Unknown error occurred');
            }
        }
    };
};
     
        
        

    
