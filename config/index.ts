/**
 * Server Configuration Module
 * Loads and validates environment variables for server configuration
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates that required environment variables are present
 * @throws {Error} If required environment variables are missing
 */
function validateConfig(): void {
  const required = ['OPENROUTER_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the required values.'
    );
  }
}

// Validate configuration on module load
validateConfig();

/**
 * Server configuration object
 */
export const config = {
  /**
   * Server port number
   */
  port: parseInt(process.env.PORT || '3001', 10),

  /**
   * OpenRouter API configuration
   */
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: process.env.AI_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  },

  /**
   * CORS configuration
   */
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  /**
   * AI processing configuration
   */
  ai: {
    batchSize: 3,
    temperature: 0.2,
    maxTokens: 250,
    contextLines: 3,
    batchDelayMs: 1500,
  },
} as const;

export default config;
