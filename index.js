#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { Innertube } from 'youtubei.js';

class YouTubeTranscriptServer {
  constructor() {
    this.server = new Server(
      {
        name: 'youtube-transcript-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.youtube = null;
    this.setupHandlers();
  }

  async initYouTube() {
    if (!this.youtube) {
      this.youtube = await Innertube.create();
    }
    return this.youtube;
  }

  extractVideoId(input) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = input.match(youtubeRegex);

    if (match) {
      return match[1];
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    return null;
  }

  async fetchTranscriptDirect(videoId, language = 'en') {
    try {
      const youtube = await this.initYouTube();

      // Get video info
      const info = await youtube.getInfo(videoId);

      if (!info) {
        throw new Error('Video not found');
      }

      const title = info.basic_info?.title || 'Unknown Video';

      // Get transcript
      const transcriptData = await info.getTranscript();

      if (!transcriptData || !transcriptData.transcript) {
        throw new Error('No transcript available for this video');
      }

      // Format transcript segments
      const segments = transcriptData.transcript.content.body.initial_segments || [];

      const formattedTranscript = segments.map(segment => {
        const text = segment.snippet?.text || '';
        const startMs = parseInt(segment.start_ms) || 0;
        const endMs = parseInt(segment.end_ms) || startMs + 1000;

        return {
          text: text.replace(/\n/g, ' ').trim(),
          start: startMs / 1000,
          duration: (endMs - startMs) / 1000
        };
      });

      return {
        success: true,
        data: {
          videoId,
          title,
          transcript: formattedTranscript,
          language
        }
      };
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  }

  formatTranscriptResponse(data, options = {}) {
    if (!data.success || !data.data) {
      return 'No transcript available';
    }

    const { title, transcript } = data.data;
    const { page = 1, maxItems = 50 } = options;

    let response = `# ${title || 'YouTube Video Transcript'}\n\n`;

    // Handle pagination
    if (maxItems && maxItems > 0) {
      const totalItems = transcript.length;
      const totalPages = Math.ceil(totalItems / maxItems);
      const startIndex = (page - 1) * maxItems;
      const endIndex = Math.min(startIndex + maxItems, totalItems);
      const paginatedTranscript = transcript.slice(startIndex, endIndex);

      response += `## Page ${page} of ${totalPages}\n`;
      response += `Items: ${paginatedTranscript.length} | Total: ${totalItems}\n\n`;

      paginatedTranscript.forEach((item) => {
        const timestamp = this.formatTimestamp(item.start);
        response += `[${timestamp}] ${item.text}\n`;
      });

      if (page < totalPages) {
        response += `\n---\nNext page available (page ${page + 1})`;
      }
    } else {
      // Full transcript
      transcript.forEach((item) => {
        const timestamp = this.formatTimestamp(item.start);
        response += `[${timestamp}] ${item.text}\n`;
      });
    }

    return response;
  }

  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_transcript',
          description: 'Get the transcript of a YouTube video. Supports pagination.',
          inputSchema: {
            type: 'object',
            properties: {
              video: {
                type: 'string',
                description: 'YouTube video ID or URL (e.g., "dQw4w9WgXcQ" or "https://www.youtube.com/watch?v=dQw4w9WgXcQ")'
              },
              language: {
                type: 'string',
                description: 'Language code for the transcript (default: "en")',
                default: 'en'
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                default: 1
              },
              maxItems: {
                type: 'number',
                description: 'Maximum transcript segments per page (default: 50)',
                default: 50
              },
              format: {
                type: 'string',
                enum: ['formatted', 'text'],
                description: 'Response format (default: "formatted")',
                default: 'formatted'
              }
            },
            required: ['video']
          }
        },
        {
          name: 'get_full_transcript',
          description: 'Get the complete transcript of a YouTube video without pagination.',
          inputSchema: {
            type: 'object',
            properties: {
              video: {
                type: 'string',
                description: 'YouTube video ID or URL'
              },
              language: {
                type: 'string',
                description: 'Language code for the transcript (default: "en")',
                default: 'en'
              },
              format: {
                type: 'string',
                enum: ['formatted', 'text'],
                description: 'Response format (default: "text" for full transcript)',
                default: 'text'
              }
            },
            required: ['video']
          }
        },
        {
          name: 'search_transcript',
          description: 'Search for specific text within a YouTube video transcript.',
          inputSchema: {
            type: 'object',
            properties: {
              video: {
                type: 'string',
                description: 'YouTube video ID or URL'
              },
              query: {
                type: 'string',
                description: 'Text to search for in the transcript'
              },
              language: {
                type: 'string',
                description: 'Language code for the transcript (default: "en")',
                default: 'en'
              },
              context: {
                type: 'number',
                description: 'Number of segments to include before and after matches (default: 2)',
                default: 2
              }
            },
            required: ['video', 'query']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_transcript': {
            const videoId = this.extractVideoId(args.video);
            if (!videoId) {
              throw new Error('Invalid YouTube video ID or URL');
            }

            const data = await this.fetchTranscriptDirect(videoId, args.language);

            if (args.format === 'text' && data.data && data.data.transcript) {
              const plainText = data.data.transcript
                .map(item => item.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

              return {
                content: [
                  {
                    type: 'text',
                    text: `# ${data.data.title}\n\n${plainText}`
                  }
                ]
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: this.formatTranscriptResponse(data, {
                    page: args.page || 1,
                    maxItems: args.maxItems || 50
                  })
                }
              ]
            };
          }

          case 'get_full_transcript': {
            const videoId = this.extractVideoId(args.video);
            if (!videoId) {
              throw new Error('Invalid YouTube video ID or URL');
            }

            const data = await this.fetchTranscriptDirect(videoId, args.language);

            if (args.format === 'text' && data.data && data.data.transcript) {
              const plainText = data.data.transcript
                .map(item => item.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

              return {
                content: [
                  {
                    type: 'text',
                    text: `# ${data.data.title}\n\n${plainText}`
                  }
                ]
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: this.formatTranscriptResponse(data)
                }
              ]
            };
          }

          case 'search_transcript': {
            const videoId = this.extractVideoId(args.video);
            if (!videoId) {
              throw new Error('Invalid YouTube video ID or URL');
            }

            const data = await this.fetchTranscriptDirect(videoId, args.language);

            if (!data.success || !data.data || !data.data.transcript) {
              throw new Error('Could not retrieve transcript for searching');
            }

            const transcript = data.data.transcript;
            const query = args.query.toLowerCase();
            const contextSize = args.context || 2;

            const matches = [];
            transcript.forEach((segment, index) => {
              if (segment.text.toLowerCase().includes(query)) {
                const start = Math.max(0, index - contextSize);
                const end = Math.min(transcript.length - 1, index + contextSize);

                const contextSegments = [];
                for (let i = start; i <= end; i++) {
                  contextSegments.push({
                    ...transcript[i],
                    isMatch: i === index
                  });
                }

                matches.push({
                  matchIndex: index,
                  timestamp: this.formatTimestamp(segment.start),
                  segments: contextSegments
                });
              }
            });

            let response = `# Search Results for "${args.query}" in ${data.data.title || 'Video'}\n\n`;
            response += `Found ${matches.length} match${matches.length !== 1 ? 'es' : ''}\n\n`;

            matches.forEach((match, idx) => {
              response += `## Match ${idx + 1} at [${match.timestamp}]\n`;
              match.segments.forEach(seg => {
                const prefix = seg.isMatch ? '**>>** ' : '   ';
                const text = seg.isMatch ? `**${seg.text}**` : seg.text;
                response += `${prefix}[${this.formatTimestamp(seg.start)}] ${text}\n`;
              });
              response += '\n';
            });

            return {
              content: [
                {
                  type: 'text',
                  text: response
                }
              ]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('YouTube Transcript MCP server running...');
  }
}

const server = new YouTubeTranscriptServer();
server.run().catch(console.error);