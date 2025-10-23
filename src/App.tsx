/**
 * YouTube Transcript Viewer - Main Application Component
 * A React application for fetching and displaying YouTube video transcripts
 * with AI-powered fact-checking capabilities
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'
import { API_CONFIG, UI_CONSTANTS, STORAGE_KEYS, DOWNLOAD_CONFIG, ERROR_MESSAGES } from './config'

// ==================== Type Definitions ====================

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  original?: string;
  corrected?: string;
  hasError?: boolean;
}

interface TranscriptResponse {
  success: boolean;
  transcript?: TranscriptItem[];
  videoId?: string;
  error?: string;
}

// ==================== Main Component ====================

function App() {
  // State management
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [enhancing, setEnhancing] = useState<boolean>(false);

  // ==================== Effects ====================

  /**
   * Load recent searches from localStorage on component mount
   */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  /**
   * Click outside handler to close history dropdown
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.input-wrapper')) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==================== Memoized Values ====================

  /**
   * Filter transcript based on search query
   */
  const filteredTranscript = useMemo(() => {
    if (!searchQuery.trim()) return transcript;
    const lowerQuery = searchQuery.toLowerCase();
    return transcript.filter(item =>
      item.text.toLowerCase().includes(lowerQuery) ||
      item.original?.toLowerCase().includes(lowerQuery) ||
      item.corrected?.toLowerCase().includes(lowerQuery)
    );
  }, [transcript, searchQuery]);

  // ==================== Utility Functions ====================

  /**
   * Formats seconds into MM:SS format
   * @param seconds - Time in seconds
   * @returns Formatted time string
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Saves a URL to recent searches
   * @param url - URL to save
   */
  const saveToRecentSearches = useCallback((url: string) => {
    const newRecent = [url, ...recentSearches.filter(u => u !== url)]
      .slice(0, UI_CONSTANTS.MAX_RECENT_SEARCHES);
    setRecentSearches(newRecent);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(newRecent));
  }, [recentSearches]);

  // ==================== API Functions ====================

  /**
   * Fetches transcript from the API
   */
  const fetchTranscript = useCallback(async () => {
    if (!videoUrl.trim()) {
      setError(ERROR_MESSAGES.EMPTY_URL);
      return;
    }

    setLoading(true);
    setError('');
    setTranscript([]);
    setSearchQuery('');

    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRANSCRIPT}?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      const data: TranscriptResponse = await response.json();

      if (data.success && data.transcript) {
        setTranscript(data.transcript);
        saveToRecentSearches(videoUrl);
      } else {
        setError(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError(ERROR_MESSAGES.SERVER_CONNECTION);
        }
      } else {
        setError(ERROR_MESSAGES.SERVER_CONNECTION);
      }
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [videoUrl, saveToRecentSearches]);

  /**
   * Enhances transcript using AI fact-checking
   */
  const enhanceTranscript = useCallback(async () => {
    if (transcript.length === 0) return;

    setEnhancing(true);

    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ENHANCE}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT * 3), // Longer timeout for AI processing
      });

      const data = await response.json();

      if (data.success && data.transcript) {
        setTranscript(data.transcript);
      } else {
        setError(data.error || ERROR_MESSAGES.ENHANCE_FAILED);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('AI processing timed out. Please try again.');
        } else {
          setError(ERROR_MESSAGES.AI_SERVICE_ERROR);
        }
      } else {
        setError(ERROR_MESSAGES.AI_SERVICE_ERROR);
      }
      console.error('Enhancement error:', err);
    } finally {
      setEnhancing(false);
    }
  }, [transcript]);

  // ==================== Event Handlers ====================

  /**
   * Handles Enter key press in input field
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchTranscript();
    }
  }, [fetchTranscript]);

  /**
   * Copies entire transcript to clipboard
   */
  const copyToClipboard = useCallback(async () => {
    const text = transcript.map(item => item.text).join(' ');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), UI_CONSTANTS.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [transcript]);

  /**
   * Copies a single transcript segment to clipboard
   */
  const copySegment = useCallback(async (item: TranscriptItem, index: number) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), UI_CONSTANTS.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy segment:', err);
    }
  }, []);

  /**
   * Downloads transcript in specified format
   */
  const downloadTranscript = useCallback((format: 'txt' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = transcript
        .map(item => `[${formatTime(item.offset / 1000)}] ${item.text}`)
        .join('\n\n');
      filename = `transcript.${DOWNLOAD_CONFIG.FORMATS.TXT.extension}`;
      mimeType = DOWNLOAD_CONFIG.FORMATS.TXT.mimeType;
    } else {
      content = JSON.stringify(transcript, null, 2);
      filename = `transcript.${DOWNLOAD_CONFIG.FORMATS.JSON.extension}`;
      mimeType = DOWNLOAD_CONFIG.FORMATS.JSON.mimeType;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.setAttribute('aria-label', `Download transcript as ${format.toUpperCase()}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [transcript, formatTime]);

  /**
   * Loads a URL from search history
   */
  const loadFromHistory = useCallback((url: string) => {
    setVideoUrl(url);
    setShowHistory(false);
  }, []);

  // ==================== Render ====================

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>YouTube Transcript Viewer</h1>
        <p>Extract and view transcripts from YouTube videos with AI-powered fact-checking</p>
      </header>

      <main>
        <section className="search-section" aria-label="Video URL input">
          <div className="search-container">
            <div className="input-wrapper">
              <label htmlFor="video-url-input" className="sr-only">
                YouTube video URL or ID
              </label>
              <input
                id="video-url-input"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setShowHistory(true)}
                placeholder="Enter YouTube URL or Video ID"
                className="url-input"
                disabled={loading}
                aria-describedby={error ? 'error-message' : undefined}
                aria-invalid={error ? 'true' : 'false'}
              />
              {recentSearches.length > 0 && showHistory && (
                <div
                  className="history-dropdown"
                  role="listbox"
                  aria-label="Recent searches"
                >
                  <div className="history-header">Recent Searches</div>
                  {recentSearches.map((url, index) => (
                    <div
                      key={index}
                      className="history-item"
                      onClick={() => loadFromHistory(url)}
                      role="option"
                      aria-selected="false"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          loadFromHistory(url);
                        }
                      }}
                    >
                      {url.length > 50 ? url.substring(0, 50) + '...' : url}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={fetchTranscript}
              className="fetch-button"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? 'Loading transcript' : 'Get transcript'}
            >
              {loading ? 'Loading...' : 'Get Transcript'}
            </button>
          </div>
        </section>

        {loading && (
          <div className="loading-skeleton" aria-live="polite" aria-label="Loading transcript">
            <div className="skeleton-header"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
        )}

        {error && (
          <div
            className="error-message"
            role="alert"
            id="error-message"
            aria-live="assertive"
          >
            <div className="error-icon" aria-hidden="true">⚠</div>
            <div className="error-text">{error}</div>
          </div>
        )}

        {transcript.length > 0 && !loading && (
          <section className="transcript-container" aria-label="Transcript content">
            <div className="transcript-header">
              <h2 id="transcript-heading">
                Transcript ({transcript.length} segments)
              </h2>
              <div className="action-buttons" role="toolbar" aria-label="Transcript actions">
                <button
                  onClick={enhanceTranscript}
                  className="action-button enhance-button"
                  disabled={enhancing}
                  title="AI-powered fact-checking and correction"
                  aria-label="Fact-check transcript with AI"
                  aria-busy={enhancing}
                >
                  {enhancing ? 'Fact-checking...' : '🔍 Fact Check & Correct'}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="action-button"
                  aria-label="Copy entire transcript to clipboard"
                >
                  {copiedIndex === -1 ? '✓ Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={() => downloadTranscript('txt')}
                  className="action-button"
                  aria-label="Download transcript as text file"
                >
                  Download TXT
                </button>
                <button
                  onClick={() => downloadTranscript('json')}
                  className="action-button"
                  aria-label="Download transcript as JSON file"
                >
                  Download JSON
                </button>
              </div>
            </div>

            <div className="search-filter">
              <label htmlFor="search-filter-input" className="sr-only">
                Search in transcript
              </label>
              <input
                id="search-filter-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in transcript..."
                className="filter-input"
                aria-label="Search in transcript"
              />
              {searchQuery && (
                <span className="search-results" aria-live="polite">
                  {filteredTranscript.length} of {transcript.length} results
                </span>
              )}
            </div>

            <div
              className="transcript-content"
              role="region"
              aria-labelledby="transcript-heading"
              tabIndex={0}
            >
              {filteredTranscript.length > 0 ? (
                filteredTranscript.map((item, index) => (
                  <article
                    key={index}
                    className={`transcript-item ${copiedIndex === index ? 'copied' : ''} ${item.hasError ? 'has-error' : ''}`}
                    onClick={() => copySegment(item, index)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Transcript segment at ${formatTime(item.offset / 1000)}. Click to copy.`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        copySegment(item, index);
                      }
                    }}
                  >
                    <time className="timestamp" dateTime={`PT${item.offset / 1000}S`}>
                      {formatTime(item.offset / 1000)}
                    </time>
                    <div className="text-content">
                      {item.hasError ? (
                        <div className="error-comparison">
                          <div className="wrong-text">
                            <span className="label" aria-label="Original incorrect text">Wrong:</span>
                            <span className="text-wrong">{item.original}</span>
                          </div>
                          <div className="correct-text">
                            <span className="label" aria-label="Corrected text">Correct:</span>
                            <span className="text-correct">{item.corrected}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text">{item.text}</span>
                      )}
                    </div>
                    {copiedIndex === index && (
                      <span className="copied-indicator" aria-label="Copied to clipboard">✓</span>
                    )}
                  </article>
                ))
              ) : (
                <div className="no-results" role="status">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
