# MCP YouTube Transcript

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

An MCP (Model Context Protocol) server that provides tools for fetching and searching YouTube video transcripts. This server integrates with AI assistants like Claude to enable transcript retrieval and analysis.

## Features

- **Get Transcript** - Fetch paginated transcripts from YouTube videos
- **Get Full Transcript** - Retrieve complete transcripts without pagination
- **Search Transcript** - Search for specific text within video transcripts with context
- **Get Channel Videos** - Extract all video IDs from a YouTube channel
- **Direct YouTube Access** - No external API keys required

## Prerequisites

- Node.js >= 18.0.0
- Python 3 with `youtube_transcript_api` package

```bash
pip install youtube-transcript-api
```

## Installation

### Option 1: Clone from GitHub

```bash
git clone https://github.com/vosamoilenko/mcp-youtube-transcript.git
cd mcp-youtube-transcript
npm install
```

### Option 2: Use npx (coming soon)

```bash
npx mcp-youtube-transcript
```

## Configuration

### Claude Desktop

Add this server to your Claude Desktop configuration:

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

### Claude Code

Add to your MCP settings:

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

## Available Tools

### 1. `get_transcript`

Fetches a paginated transcript from a YouTube video.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video` | string | Yes | - | YouTube video ID or URL |
| `language` | string | No | `"en"` | Language code for the transcript |
| `page` | number | No | `1` | Page number for pagination |
| `maxItems` | number | No | `50` | Maximum segments per page |
| `format` | string | No | `"formatted"` | Response format: `"formatted"` or `"text"` |

**Example:**
```
Get the transcript for video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 2. `get_full_transcript`

Retrieves the complete transcript without pagination.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video` | string | Yes | - | YouTube video ID or URL |
| `language` | string | No | `"en"` | Language code for the transcript |
| `format` | string | No | `"text"` | Response format: `"formatted"` or `"text"` |

**Example:**
```
Get the full transcript of video ID: dQw4w9WgXcQ
```

### 3. `search_transcript`

Searches for specific text within a video transcript.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video` | string | Yes | - | YouTube video ID or URL |
| `query` | string | Yes | - | Text to search for |
| `language` | string | No | `"en"` | Language code |
| `context` | number | No | `2` | Segments to include before/after matches |

**Example:**
```
Search for "machine learning" in video: https://www.youtube.com/watch?v=example
```

### 4. `get_channel_videos`

Extracts all video IDs from a YouTube channel.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `channel` | string | Yes | - | Channel handle, ID, or URL |
| `maxResults` | number | No | `null` | Max videos to return (null = all) |
| `format` | string | No | `"detailed"` | `"detailed"`, `"list"`, or `"ids_only"` |

**Supported channel formats:**
- Handle: `@MrBeast` or `MrBeast`
- Channel ID: `UCX6OQ3DkcsbYNE6H8uQQuVA`
- URL: `https://www.youtube.com/@MrBeast`
- URL: `https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA`

**Example:**
```
Get all video IDs from channel: @MrBeast
```

## Usage Examples

Once configured, you can use natural language with Claude:

1. **Fetch a transcript:**
   > "Get me the transcript of this YouTube video: [URL]"

2. **Search within a transcript:**
   > "Search for mentions of 'artificial intelligence' in this video: [URL]"

3. **Get full transcript as text:**
   > "Give me the complete transcript of video ID abc123xyz in plain text"

4. **Get all videos from a channel:**
   > "Extract all video IDs from the channel @MrBeast"

## Development

### Running Locally

```bash
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only (faster, no network)
npm run test:unit

# Run integration tests (requires network)
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Exporting Channel Videos (CLI)

```bash
npm run export-channel -- @channelname
```

## How It Works

This MCP server uses:
- **youtubei.js** - Direct access to YouTube's InnerTube API for video info and channel data
- **youtube_transcript_api** (Python) - Reliable transcript fetching with language support

## Limitations

- Transcripts are only available for videos that have captions/subtitles
- Videos must be publicly accessible
- Age-restricted videos may not be accessible
- Some videos may have transcripts disabled by the uploader

## Error Handling

The server provides detailed error messages for common issues:
- Invalid video ID or URL format
- Video not found
- Transcript not available
- Channel not found
- Network errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions, please [open an issue](https://github.com/vosamoilenko/mcp-youtube-transcript/issues) on GitHub.
