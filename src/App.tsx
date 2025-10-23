import { useState, useEffect, useMemo } from 'react'
import './App.css'

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

function App() {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [enhancing, setEnhancing] = useState<boolean>(false);
  const [enhanceProgress, setEnhanceProgress] = useState<number>(0);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Filter transcript based on search query
  const filteredTranscript = useMemo(() => {
    if (!searchQuery.trim()) return transcript;
    return transcript.filter(item =>
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcript, searchQuery]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchTranscript = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript([]);
    setSearchQuery('');

    try {
      const response = await fetch(`http://localhost:3001/api/transcript?url=${encodeURIComponent(videoUrl)}`);
      const data: TranscriptResponse = await response.json();

      if (data.success && data.transcript) {
        setTranscript(data.transcript);

        // Add to recent searches
        const newRecent = [videoUrl, ...recentSearches.filter(url => url !== videoUrl)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      } else {
        setError(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchTranscript();
    }
  };

  const copyToClipboard = () => {
    const text = transcript.map(item => item.text).join(' ');
    navigator.clipboard.writeText(text);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copySegment = (item: TranscriptItem, index: number) => {
    navigator.clipboard.writeText(item.text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadTranscript = (format: 'txt' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = transcript.map(item => `[${formatTime(item.offset / 1000)}] ${item.text}`).join('\n\n');
      filename = 'transcript.txt';
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify(transcript, null, 2);
      filename = 'transcript.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (url: string) => {
    setVideoUrl(url);
    setShowHistory(false);
  };

  const enhanceTranscript = async () => {
    if (transcript.length === 0) return;

    setEnhancing(true);
    setEnhanceProgress(0);

    try {
      const response = await fetch('http://localhost:3001/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript })
      });

      const data = await response.json();

      if (data.success && data.transcript) {
        setTranscript(data.transcript);
        setEnhanceProgress(100);
      } else {
        setError(data.error || 'Failed to fact-check transcript');
      }
    } catch (err) {
      setError('Failed to connect to AI fact-checking service');
      console.error(err);
    } finally {
      setTimeout(() => {
        setEnhancing(false);
        setEnhanceProgress(0);
      }, 1000);
    }
  };

  // Click outside to close history dropdown
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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>YouTube Transcript Viewer</h1>
        <p>Extract and view transcripts from YouTube videos</p>
      </header>

      <div className="search-section">
        <div className="search-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowHistory(true)}
              placeholder="Enter YouTube URL or Video ID"
              className="url-input"
              disabled={loading}
            />
            {recentSearches.length > 0 && showHistory && (
              <div className="history-dropdown">
                <div className="history-header">Recent Searches</div>
                {recentSearches.map((url, index) => (
                  <div
                    key={index}
                    className="history-item"
                    onClick={() => loadFromHistory(url)}
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
          >
            {loading ? 'Loading...' : 'Get Transcript'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <div className="error-icon">⚠</div>
          <div className="error-text">{error}</div>
        </div>
      )}

      {transcript.length > 0 && !loading && (
        <div className="transcript-container">
          <div className="transcript-header">
            <h2>Transcript ({transcript.length} segments)</h2>
            <div className="action-buttons">
              <button
                onClick={enhanceTranscript}
                className="action-button enhance-button"
                disabled={enhancing}
                title="AI-powered fact-checking and correction"
              >
                {enhancing ? `Fact-checking...` : '🔍 Fact Check & Correct'}
              </button>
              <button onClick={copyToClipboard} className="action-button">
                {copiedIndex === -1 ? '✓ Copied!' : 'Copy All'}
              </button>
              <button onClick={() => downloadTranscript('txt')} className="action-button">
                Download TXT
              </button>
              <button onClick={() => downloadTranscript('json')} className="action-button">
                Download JSON
              </button>
            </div>
          </div>

          <div className="search-filter">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in transcript..."
              className="filter-input"
            />
            {searchQuery && (
              <span className="search-results">
                {filteredTranscript.length} of {transcript.length} results
              </span>
            )}
          </div>

          <div className="transcript-content">
            {filteredTranscript.length > 0 ? (
              filteredTranscript.map((item, index) => (
                <div
                  key={index}
                  className={`transcript-item ${copiedIndex === index ? 'copied' : ''} ${item.hasError ? 'has-error' : ''}`}
                  onClick={() => copySegment(item, index)}
                  title="Click to copy"
                >
                  <span className="timestamp">{formatTime(item.offset / 1000)}</span>
                  <div className="text-content">
                    {item.hasError ? (
                      <>
                        <div className="error-comparison">
                          <div className="wrong-text">
                            <span className="label">Wrong:</span>
                            <span className="text-wrong">{item.original}</span>
                          </div>
                          <div className="correct-text">
                            <span className="label">Correct:</span>
                            <span className="text-correct">{item.corrected}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text">{item.text}</span>
                    )}
                  </div>
                  {copiedIndex === index && <span className="copied-indicator">✓</span>}
                </div>
              ))
            ) : (
              <div className="no-results">No results found for "{searchQuery}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
