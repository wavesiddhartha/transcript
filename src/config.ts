/**
 * Application configuration constants
 * Centralized configuration management for the entire application
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  ENDPOINTS: {
    TRANSCRIPT: '/api/transcript',
    ENHANCE: '/api/enhance',
  },
  TIMEOUT: 30000, // 30 seconds
} as const;

/**
 * UI Constants
 */
export const UI_CONSTANTS = {
  MAX_RECENT_SEARCHES: 5,
  COPY_FEEDBACK_DURATION: 2000, // 2 seconds
  SEARCH_DEBOUNCE_MS: 300,
  MAX_TRANSCRIPT_HEIGHT: 600,
} as const;

/**
 * Video ID Regex Patterns
 */
export const VIDEO_PATTERNS = {
  YOUTUBE_ID_LENGTH: 11,
  MIN_VIDEO_ID_LENGTH: 5,
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  RECENT_SEARCHES: 'recentSearches',
} as const;

/**
 * File Download Configuration
 */
export const DOWNLOAD_CONFIG = {
  FORMATS: {
    TXT: {
      extension: 'txt',
      mimeType: 'text/plain',
    },
    JSON: {
      extension: 'json',
      mimeType: 'application/json',
    },
  },
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  EMPTY_URL: 'Please enter a YouTube URL',
  SERVER_CONNECTION: 'Failed to connect to server. Make sure the backend is running.',
  NO_TRANSCRIPT: 'No transcript available for this video.',
  INVALID_URL: 'Invalid YouTube URL or video ID',
  ENHANCE_FAILED: 'Failed to fact-check transcript',
  AI_SERVICE_ERROR: 'Failed to connect to AI fact-checking service',
} as const;
