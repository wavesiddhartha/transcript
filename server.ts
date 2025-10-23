import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const OPENROUTER_API_KEY = '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';
const AI_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  original?: string;
  corrected?: string;
  hasError?: boolean;
}

// Function to fetch transcripts using Python script
async function fetchYoutubeTranscript(videoId: string): Promise<TranscriptItem[]> {
  try {
    console.log(`Calling Python script for video: ${videoId}`);

    const { stdout, stderr } = await execPromise(`python3 fetch_transcript.py ${videoId}`);

    if (stderr && !stderr.includes('NotOpenSSLWarning') && !stderr.includes('urllib3')) {
      console.error('Python stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch transcript');
    }

    console.log(`Successfully fetched ${result.transcript.length} transcript segments`);
    return result.transcript;
  } catch (error: any) {
    console.error('Error in fetchYoutubeTranscript:', error.message);
    throw error;
  }
}

app.get('/api/transcript', async (req: Request, res: Response) => {
  try {
    const videoUrl = req.query.url as string;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Extract video ID from URL - supports multiple formats
    let videoId = '';

    if (videoUrl.includes('youtube.com/watch?v=')) {
      // Standard YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
      videoId = videoUrl.split('v=')[1]?.split('&')[0]?.split('?')[0] || '';
    } else if (videoUrl.includes('youtu.be/')) {
      // Short URL: https://youtu.be/VIDEO_ID
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (videoUrl.includes('youtube.com/shorts/')) {
      // YouTube Shorts: https://youtube.com/shorts/VIDEO_ID
      videoId = videoUrl.split('shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (videoUrl.includes('youtube.com/embed/')) {
      // Embed URL: https://www.youtube.com/embed/VIDEO_ID
      videoId = videoUrl.split('embed/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else {
      // Assume it's just the video ID
      videoId = videoUrl.trim();
    }

    // Clean up video ID - remove any remaining query params or fragments
    videoId = videoId.split('?')[0].split('#')[0].split('&')[0];

    if (!videoId || videoId.length < 5) {
      return res.status(400).json({ error: 'Invalid YouTube URL or video ID' });
    }

    console.log(`Fetching transcript for video ID: ${videoId}`);

    // Fetch transcript using custom scraper
    const transcript = await fetchYoutubeTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No transcript available for this video. Make sure the video has captions/subtitles enabled.'
      });
    }

    console.log(`Successfully fetched ${transcript.length} transcript segments`);

    res.json({
      success: true,
      transcript,
      videoId
    });
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transcript. Please make sure the video exists and has captions available.'
    });
  }
});

// AI Fact-Checking endpoint
async function factCheckWithAI(text: string, context: string[]): Promise<string> {
  try {
    const contextText = context.length > 0
      ? `\n\nContext from previous lines:\n${context.slice(-3).join('\n')}`
      : '';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://youtube-transcript-app.local',
        'X-Title': 'YouTube Transcript Fact Checker',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a transcript fact-checker and correction AI. Your job is to:
1. Check if the transcribed text makes logical sense
2. Fix any transcription errors (mishearing, wrong words)
3. Correct factual errors if obvious
4. Fix grammar and punctuation
5. Ensure clarity and coherence

Return ONLY the corrected text without explanations or comments. If the text is already correct, return it unchanged.`
          },
          {
            role: 'user',
            content: `Check and correct this transcript line:${contextText}\n\nCurrent line to check:\n"${text}"`
          }
        ],
        temperature: 0.2,
        max_tokens: 250
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('AI fact-check error:', error);
    return text;
  }
}

app.post('/api/enhance', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Invalid transcript data' });
    }

    console.log(`Fact-checking ${transcript.length} transcript segments with AI...`);

    const corrected: TranscriptItem[] = [];
    const batchSize = 3; // Smaller batch for more context accuracy
    const processedTexts: string[] = [];

    for (let i = 0; i < transcript.length; i += batchSize) {
      const batch = transcript.slice(i, i + batchSize);

      const promises = batch.map(async (item: TranscriptItem, idx: number) => {
        const currentIndex = i + idx;
        const context = processedTexts.slice(Math.max(0, currentIndex - 3), currentIndex);
        const correctedText = await factCheckWithAI(item.text, context);

        const hasError = correctedText.trim() !== item.text.trim();

        return {
          ...item,
          text: correctedText,
          original: hasError ? item.text : undefined,
          corrected: hasError ? correctedText : undefined,
          hasError
        };
      });

      const results = await Promise.all(promises);

      // Store corrected texts for context in next batches
      results.forEach(result => processedTexts.push(result.text));
      corrected.push(...results);

      console.log(`Fact-checked ${Math.min(i + batchSize, transcript.length)}/${transcript.length} segments`);

      // Delay between batches to respect rate limits
      if (i + batchSize < transcript.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    res.json({
      success: true,
      transcript: corrected
    });
  } catch (error: any) {
    console.error('Fact-check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fact-check transcript'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
