#!/usr/bin/env python3
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def fetch_transcript(video_id):
    try:
        # Fetch transcript using the newer API
        api = YouTubeTranscriptApi()
        transcripts = api.list(video_id)

        # Try to get English transcript first
        try:
            fetched_transcript = transcripts.find_transcript(['en', 'en-US', 'en-GB']).fetch()
        except:
            # If English not available, get the first available transcript
            fetched_transcript = list(transcripts)[0].fetch()

        # Format the transcript - accessing snippets
        result = []
        for snippet in fetched_transcript.snippets:
            result.append({
                'text': snippet.text,
                'duration': snippet.duration * 1000,  # Convert to milliseconds
                'offset': snippet.start * 1000  # Convert to milliseconds
            })

        # Output as JSON
        print(json.dumps({
            'success': True,
            'transcript': result
        }))

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No video ID provided'
        }))
        sys.exit(1)

    video_id = sys.argv[1]
    fetch_transcript(video_id)
