interface AIResponse {
  success: boolean;
  enhanced?: string;
  original?: string;
  error?: string;
}

const OPENROUTER_API_KEY = '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';
const MODEL = 'tngtech/deepseek-r1t2-chimera:free';

export async function enhanceTranscriptLine(text: string): Promise<AIResponse> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://youtube-transcript-app.local',
        'X-Title': 'YouTube Transcript Enhancer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a transcript enhancement AI. Your job is to fix grammar, punctuation, and clarity issues in YouTube transcript lines. Return ONLY the corrected text without explanations. If the text is already perfect, return it unchanged.'
          },
          {
            role: 'user',
            content: `Fix this transcript line for grammar and clarity:\n\n${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      throw new Error('No response from AI');
    }

    return {
      success: true,
      enhanced,
      original: text
    };
  } catch (error: any) {
    console.error('AI enhancement error:', error);
    return {
      success: false,
      error: error.message,
      original: text
    };
  }
}

export async function enhanceTranscriptBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, string>> {
  const enhanced = new Map<number, string>();
  const batchSize = 5; // Process 5 at a time to avoid rate limits

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const promises = batch.map((text, idx) =>
      enhanceTranscriptLine(text).then(result => ({
        index: i + idx,
        text: result.success ? result.enhanced! : text
      }))
    );

    const results = await Promise.all(promises);
    results.forEach(({ index, text }) => enhanced.set(index, text));

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return enhanced;
}
