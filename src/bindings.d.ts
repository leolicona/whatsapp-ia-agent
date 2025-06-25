// Cloudflare Workers environment bindings
// This file defines TypeScript types for environment variables and Cloudflare services

export interface Env {

  //IA 
  GEMINI_API_KEY: string;

  // Environment variables
  JWT_SECRET: string;
  OTPLESS_CLIENT_ID: string;
  OTPLESS_CLIENT_SECRET: string;
  OTPLESS_API_URL: string;
  
  // WhatsApp Cloud API configuration
  WHATSAPP_API_VERSION: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_API_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  
  // Cloudflare KV namespace for session storage
  AUTH_KV: KVNamespace;
  
  // Cloudflare D1 database for user data
  DB: D1Database;
  
  // Optional: R2 bucket for file storage
  ASSETS_BUCKET?: R2Bucket;
  
  // Optional: Analytics Engine for tracking
  ANALYTICS?: AnalyticsEngineDataset;
  
  // Optional: Queue for background tasks
  AUTH_QUEUE?: Queue;
  
  // Durable Object for webhook processing
  WEBHOOK_PROCESSOR: DurableObjectNamespace;
}

// Extend the Hono Context type to include our environment
declare module 'hono' {
  interface ContextVariableMap {
    env: Env;
  }
}