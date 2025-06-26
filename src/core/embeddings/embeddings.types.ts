export interface MatchVectorParams {
    queryVector: number[];
    topK?: number;
}

export interface StoreVectorParams {
    vectors: {
        id: string;
        values: number[];
        metadata?: Record<string, any>;
    }[];
}

export interface EmbeddingsConfig {
    apiKey: string;
    vectorize: Vectorize;
}