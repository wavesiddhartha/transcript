/**
 * YouTube Transcript API Server
 * Express server providing transcript fetching and AI-powered enhancement
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import config from './config/index.js';

const execPromise = promisify(exec);

const app = express();

// ==================== Middleware Configuration ====================

/**
 * CORS middleware - allows cross-origin requests from frontend
 */
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

/**
 * JSON body parser with size limits
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * Rate limiting middleware to prevent abuse
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

/**
 * Request logging middleware
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ==================== Type Definitions ====================

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  original?: string;
  corrected?: string;
  hasError?: boolean;
}

interface PythonScriptResponse {
  success: boolean;
  transcript?: TranscriptItem[];
  error?: string;
}

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// ==================== Utility Functions ====================

/**
 * Validates a YouTube URL or video ID
 * @param input - URL or video ID to validate
 * @returns Validation result with extracted video ID if valid
 */
function validateYouTubeInput(input: string): { valid: boolean; videoId?: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input' };
  }

  const trimmed = input.trim();

  // If it looks like a URL, validate as URL
  if (trimmed.includes('://') || trimmed.includes('www.')) {
    if (!validator.isURL(trimmed, { protocols: ['http', 'https'], require_protocol: false })) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  const videoId = extractVideoId(trimmed);

  if (!videoId || videoId.length < 5) {
    return { valid: false, error: 'Could not extract valid video ID' };
  }

  // YouTube video IDs are typically 11 characters, alphanumeric with dashes and underscores
  if (!/^[a-zA-Z0-9_-]{5,20}$/.test(videoId)) {
    return { valid: false, error: 'Invalid video ID format' };
  }

  return { valid: true, videoId };
}

/**
 * Extracts video ID from various YouTube URL formats
 * @param input - YouTube URL or video ID
 * @returns Extracted video ID or empty string
 */
function extractVideoId(input: string): string {
  let videoId = '';

  if (input.includes('youtube.com/watch?v=')) {
    // Standard YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
    videoId = input.split('v=')[1]?.split('&')[0]?.split('?')[0] || '';
  } else if (input.includes('youtu.be/')) {
    // Short URL: https://youtu.be/VIDEO_ID
    videoId = input.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
  } else if (input.includes('youtube.com/shorts/')) {
    // YouTube Shorts: https://youtube.com/shorts/VIDEO_ID
    videoId = input.split('shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
  } else if (input.includes('youtube.com/embed/')) {
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    videoId = input.split('embed/')[1]?.split('?')[0]?.split('&')[0] || '';
  } else {
    // Assume it's just the video ID
    videoId = input.trim();
  }

  // Clean up video ID - remove any remaining query params or fragments
  return videoId.split('?')[0].split('#')[0].split('&')[0];
}

/**
 * Sleeps for specified milliseconds (for retry delays)
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn - Async function to execute
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds for exponential backoff
 * @returns Result of the function
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

// ==================== Core Functions ====================

/**
 * Fetches YouTube transcript using Python script
 * @param videoId - YouTube video ID
 * @returns Array of transcript items
 * @throws Error if transcript cannot be fetched
 */
async function fetchYoutubeTranscript(videoId: string): Promise<TranscriptItem[]> {
  try {
    console.log(`Fetching transcript for video: ${videoId}`);

    const { stdout, stderr } = await execPromise(`python3 fetch_transcript.py ${videoId}`);

    if (stderr && !stderr.includes('NotOpenSSLWarning') && !stderr.includes('urllib3')) {
      console.error('Python stderr:', stderr);
    }

    const result: PythonScriptResponse = JSON.parse(stdout);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch transcript');
    }

    console.log(`Successfully fetched ${result.transcript?.length || 0} transcript segments`);
    return result.transcript || [];
  } catch (error: any) {
    console.error('Error in fetchYoutubeTranscript:', error.message);
    throw error;
  }
}

/**
 * Fact-checks and corrects text using AI with retry logic
 * @param text - Text to fact-check
 * @param context - Previous transcript lines for context
 * @returns Corrected text
 */
async function factCheckWithAI(text: string, context: string[]): Promise<string> {
  const makeRequest = async (): Promise<string> => {
    const contextText = context.length > 0
      ? `\n\nContext from previous lines:\n${context.slice(-config.ai.contextLines).join('\n')}`
      : '';

    const response = await fetch(config.openRouter.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'HTTP-Referer': 'https://youtube-transcript-app.local',
        'X-Title': 'YouTube Transcript Fact Checker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openRouter.model,
        messages: [
          {
            role: 'system',
            content: `You are a transcript fact-checker and correction AI. Your job is to:
1. Check if the transcribed text makes logical sense
2. Fix any transcription errors (mishearing, wrong words)
3. Correct factual errors if obvious
4. Fix grammar and punctuation
5. Ensure clarity and coherence

Return ONLY the corrected text without explanations or comments. If the text is already correct, return it unchanged.`,
          },
          {
            role: 'user',
            content: `Check and correct this transcript line:${contextText}\n\nCurrent line to check:\n"${text}"`,
          },
        ],
        temperature: config.ai.temperature,
        max_tokens: config.ai.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API request failed with status ${response.status}`);
    }

    const data: AIResponse = await response.json();
    const correctedText = data.choices?.[0]?.message?.content?.trim();

    if (!correctedText) {
      throw new Error('No response from AI');
    }

    return correctedText;
  };

  try {
    return await withRetry(makeRequest, 3, 1000);
  } catch (error) {
    console.error('AI fact-check error after retries:', error);
    return text; // Return original text if all retries fail
  }
}

// ==================== API Routes ====================

/**
 * GET /api/transcript
 * Fetches transcript for a YouTube video
 */
app.get('/api/transcript', async (req: Request, res: Response) => {
  try {
    const videoUrl = req.query.url as string;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Video URL is required',
      });
    }

    // Validate and extract video ID
    const validation = validateYouTubeInput(videoUrl);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid YouTube URL or video ID',
      });
    }

    const videoId = validation.videoId!;

    // Fetch transcript
    const transcript = await fetchYoutubeTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No transcript available for this video. Make sure the video has captions/subtitles enabled.',
      });
    }

    res.json({
      success: true,
      transcript,
      videoId,
    });
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transcript. Please make sure the video exists and has captions available.',
    });
  }
});

/**
 * POST /api/enhance
 * AI-powered fact-checking and enhancement of transcript
 */
app.post('/api/enhance', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript data',
      });
    }

    if (transcript.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is empty',
      });
    }

    console.log(`Fact-checking ${transcript.length} transcript segments with AI...`);

    const corrected: TranscriptItem[] = [];
    const processedTexts: string[] = [];

    for (let i = 0; i < transcript.length; i += config.ai.batchSize) {
      const batch = transcript.slice(i, i + config.ai.batchSize);

      const promises = batch.map(async (item: TranscriptItem, idx: number) => {
        const currentIndex = i + idx;
        const context = processedTexts.slice(Math.max(0, currentIndex - config.ai.contextLines), currentIndex);
        const correctedText = await factCheckWithAI(item.text, context);

        const hasError = correctedText.trim() !== item.text.trim();

        return {
          ...item,
          text: correctedText,
          original: hasError ? item.text : undefined,
          corrected: hasError ? correctedText : undefined,
          hasError,
        };
      });

      const results = await Promise.all(promises);

      // Store corrected texts for context in next batches
      results.forEach(result => processedTexts.push(result.text));
      corrected.push(...results);

      console.log(`Fact-checked ${Math.min(i + config.ai.batchSize, transcript.length)}/${transcript.length} segments`);

      // Delay between batches to respect rate limits
      if (i + config.ai.batchSize < transcript.length) {
        await sleep(config.ai.batchDelayMs);
      }
    }

    res.json({
      success: true,
      transcript: corrected,
    });
  } catch (error: any) {
    console.error('Fact-check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fact-check transcript',
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ==================== Error Handling ====================

/**
 * 404 handler for unknown routes
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

/**
 * Global error handler
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ==================== Server Startup ====================

app.listen(config.port, () => {
  console.log(`\n🚀 Server running on http://localhost:${config.port}`);
  console.log(`📝 API endpoints:`);
  console.log(`   - GET  http://localhost:${config.port}/api/transcript?url=<youtube-url>`);
  console.log(`   - POST http://localhost:${config.port}/api/enhance`);
  console.log(`   - GET  http://localhost:${config.port}/health\n`);
});
