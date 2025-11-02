# MCP YouTube Transcript Server

An MCP (Model Context Protocol) server that provides tools for fetching and searching YouTube video transcripts. This server integrates with AI assistants like Claude to enable transcript retrieval and analysis.

## Features

- **Get Transcript**: Fetch paginated transcripts from YouTube videos using the InnerTube API
- **Get Full Transcript**: Retrieve complete transcripts without pagination
- **Search Transcript**: Search for specific text within video transcripts with context
- **Direct YouTube Access**: No external API required - fetches directly from YouTube

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/mcp-youtube-transcript.git
cd mcp-youtube-transcript
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Claude Desktop Setup

Add this server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "youtube-transcript": {
      "command": "node",
      "args": ["/path/to/mcp-youtube-transcript/index.js"]
    }
  }
}
```

Replace `/path/to/mcp-youtube-transcript` with the actual path to this project.

### Dependencies

This MCP server uses the `youtubei.js` library to directly fetch transcripts from YouTube's InnerTube API, so no external API endpoints are required.

## Available Tools

### 1. get_transcript

Fetches a paginated transcript from a YouTube video.

**Parameters:**
- `video` (required): YouTube video ID or URL
- `language`: Language code (default: "en")
- `page`: Page number for pagination (default: 1)
- `maxItems`: Maximum segments per page (default: 50)
- `format`: Response format - "json" or "text" (default: "json")

**Example:**
```
Get the transcript for video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 2. get_full_transcript

Retrieves the complete transcript without pagination.

**Parameters:**
- `video` (required): YouTube video ID or URL
- `language`: Language code (default: "en")
- `format`: Response format - "json" or "text" (default: "text")

**Example:**
```
Get the full transcript of video ID: dQw4w9WgXcQ
```

### 3. search_transcript

Searches for specific text within a video transcript.

**Parameters:**
- `video` (required): YouTube video ID or URL
- `query` (required): Text to search for
- `language`: Language code (default: "en")
- `context`: Number of segments to include before/after matches (default: 2)

**Example:**
```
Search for "machine learning" in video: https://www.youtube.com/watch?v=example
```

## Usage Examples

Once configured in Claude Desktop, you can use natural language to interact with the tools:

1. **Fetch a transcript:**
   "Get me the transcript of this YouTube video: [URL]"

2. **Search within a transcript:**
   "Search for mentions of 'artificial intelligence' in this video: [URL]"

3. **Get full transcript as text:**
   "Give me the complete transcript of video ID abc123xyz in plain text"

## How It Works

This MCP server uses the `youtubei.js` library to directly interface with YouTube's InnerTube API. This provides:

- Direct access to YouTube transcripts without third-party APIs
- Support for videos with auto-generated or manual captions
- Multiple language support when available
- Reliable transcript fetching with proper error handling

## Development

### Running Locally

```bash
npm start
```

### Testing

The server can be tested using the MCP inspector or by configuring it in Claude Desktop.

## Limitations

- Transcripts are only available for videos that have captions/subtitles
- The video must be publicly accessible
- Age-restricted videos may not be accessible
- API rate limits may apply

## Error Handling

The server provides detailed error messages for common issues:
- Invalid video ID or URL format
- Video not found
- Transcript not available
- Network errors

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions, please open an issue on GitHub.