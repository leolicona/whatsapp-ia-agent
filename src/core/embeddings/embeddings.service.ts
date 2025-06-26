import { GoogleGenAI } from '@google/genai';
import { MatchVectorParams, StoreVectorParams, EmbeddingsConfig } from './embeddings.types';



export const embeddings = async (config: EmbeddingsConfig) => {

    return {
        createVectors: async (text: string) => {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            return await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: text,
                config: {
                    taskType: 'SEMANTIC_SIMILARITY',
                }
            });
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
     
        
        

    
