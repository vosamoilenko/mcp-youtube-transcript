#!/usr/bin/env python3
"""
Fetch YouTube video transcript using youtube_transcript_api.
Output is JSON for easy parsing by Node.js.
"""

import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def fetch_transcript(video_id, language='en'):
    """Fetch transcript for a given video ID."""
    try:
        api = YouTubeTranscriptApi()

        # Try to get the transcript in the requested language
        try:
            transcript = api.fetch(video_id, languages=[language])
        except Exception:
            # Fall back to any available transcript
            transcript = api.fetch(video_id)

        # Convert to list of dicts
        segments = []
        for snippet in transcript.snippets:
            segments.append({
                'text': snippet.text,
                'start': snippet.start,
                'duration': snippet.duration
            })

        result = {
            'success': True,
            'data': {
                'videoId': video_id,
                'transcript': segments,
                'language': language
            }
        }
        print(json.dumps(result))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Video ID required'}))
        sys.exit(1)

    video_id = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'en'

    fetch_transcript(video_id, language)
