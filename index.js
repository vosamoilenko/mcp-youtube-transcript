#!/usr/bin/env node

/**
 * MCP YouTube Transcript Server
 *
 * An MCP (Model Context Protocol) server that provides tools for fetching
 * and searching YouTube video transcripts, as well as extracting channel video lists.
 *
 * @module mcp-youtube-transcript
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Innertube } from 'youtubei.js';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFilePromise = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * YouTube Transcript MCP Server
 *
 * Provides MCP tools for interacting with YouTube transcripts and channels.
 *
 * @class YouTubeTranscriptServer
 */
export class YouTubeTranscriptServer {
  /**
   * Creates a new YouTubeTranscriptServer instance.
   * Initializes the MCP server with tool capabilities.
   */
  constructor() {
    this.server = new Server(
      {
        name: 'youtube-transcript-mcp',
        version: '1.0.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    /** @type {Innertube|null} */
    this.youtube = null;
    this.setupHandlers();
  }

  /**
   * Initializes the YouTube InnerTube client.
   * Uses lazy initialization - only creates the client on first use.
   *
   * @returns {Promise<Innertube>} The initialized YouTube client
   */
  async initYouTube() {
    if (!this.youtube) {
      this.youtube = await Innertube.create();
    }
    return this.youtube;
  }

  /**
   * Extracts a YouTube video ID from various input formats.
   *
   * Supports:
   * - Direct 11-character video IDs
   * - youtube.com/watch?v= URLs
   * - youtu.be/ short URLs
   * - youtube.com/embed/ URLs
   * - youtube.com/v/ URLs
   *
   * @param {string} input - Video ID or URL to parse
   * @returns {string|null} The extracted video ID, or null if invalid
   *
   * @example
   * extractVideoId('dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
   * extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
   * extractVideoId('https://youtu.be/dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
   */
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

  /**
   * Extracts channel information from various input formats.
   *
   * Supports:
   * - @username handles
   * - Channel IDs (24-character, UC-prefixed)
   * - youtube.com/channel/ URLs
   * - youtube.com/@username URLs
   * - youtube.com/c/ URLs
   * - youtube.com/user/ URLs
   *
   * @param {string} input - Channel identifier or URL to parse
   * @returns {{type: 'handle'|'id', value: string}|null} Channel info object or null if invalid
   *
   * @example
   * extractChannelId('@MrBeast') // { type: 'handle', value: '@MrBeast' }
   * extractChannelId('UCX6OQ3DkcsbYNE6H8uQQuVA') // { type: 'id', value: 'UCX6OQ3DkcsbYNE6H8uQQuVA' }
   */
  extractChannelId(input) {
    // Handle @username format (new YouTube handles)
    if (input.startsWith('@')) {
      return { type: 'handle', value: input };
    }

    // Handle channel URL formats
    // https://www.youtube.com/channel/UC...
    const channelRegex = /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/;
    const channelMatch = input.match(channelRegex);
    if (channelMatch) {
      return { type: 'id', value: channelMatch[1] };
    }

    // https://www.youtube.com/c/ChannelName or /user/ChannelName
    const cOrUserRegex = /youtube\.com\/(?:c|user)\/([a-zA-Z0-9_-]+)/;
    const cOrUserMatch = input.match(cOrUserRegex);
    if (cOrUserMatch) {
      return { type: 'handle', value: `@${cOrUserMatch[1]}` };
    }

    // https://www.youtube.com/@channelname
    const atRegex = /youtube\.com\/@([a-zA-Z0-9_-]+)/;
    const atMatch = input.match(atRegex);
    if (atMatch) {
      return { type: 'handle', value: `@${atMatch[1]}` };
    }

    // Direct channel ID (starts with UC, HC, etc.)
    if (/^[a-zA-Z0-9_-]{24}$/.test(input) || /^UC[a-zA-Z0-9_-]{22}$/.test(input)) {
      return { type: 'id', value: input };
    }

    // Direct handle format
    if (/^@[a-zA-Z0-9_-]+$/.test(input)) {
      return { type: 'handle', value: input };
    }

    // Try as username without @
    if (/^[a-zA-Z0-9_-]+$/.test(input)) {
      return { type: 'handle', value: `@${input}` };
    }

    return null;
  }

  /**
   * Extracts the video ID from a YouTube video object.
   * Handles various response formats from the YouTube API.
   *
   * @private
   * @param {Object} video - Video object from YouTube API
   * @returns {string|null} The video ID or null if not found
   */
  _extractVideoIdFromObject(video) {
    if (video.id) {
      if (typeof video.id === 'string') {
        return video.id;
      } else if (video.id.video_id) {
        return video.id.video_id;
      } else if (video.id.id) {
        return video.id.id;
      }
    } else if (video.video_id) {
      return video.video_id;
    } else if (video.endpoint?.watch_endpoint?.video_id) {
      return video.endpoint.watch_endpoint.video_id;
    } else if (video.navigation_endpoint?.watch_endpoint?.video_id) {
      return video.navigation_endpoint.watch_endpoint.video_id;
    }
    return null;
  }

  /**
   * Extracts the title from a YouTube video object.
   * Handles various response formats from the YouTube API.
   *
   * @private
   * @param {Object} video - Video object from YouTube API
   * @returns {string} The video title or 'Unknown'
   */
  _extractTitleFromVideo(video) {
    if (video.title) {
      if (typeof video.title === 'string') {
        return video.title;
      } else if (video.title.text) {
        return video.title.text;
      } else if (video.title.runs && video.title.runs[0]) {
        return video.title.runs[0].text;
      } else if (Array.isArray(video.title) && video.title[0]) {
        return typeof video.title[0] === 'string' ? video.title[0] : video.title[0].text;
      }
    }
    return 'Unknown';
  }

  /**
   * Extracts the published date from a YouTube video object.
   *
   * @private
   * @param {Object} video - Video object from YouTube API
   * @returns {string|null} The published date string or null
   */
  _extractPublishedDate(video) {
    if (video.published) {
      return typeof video.published === 'string'
        ? video.published
        : video.published.text || video.published.simple_text;
    } else if (video.published_time) {
      return typeof video.published_time === 'string'
        ? video.published_time
        : video.published_time.text || video.published_time.simple_text;
    }
    return null;
  }

  /**
   * Extracts the view count from a YouTube video object.
   *
   * @private
   * @param {Object} video - Video object from YouTube API
   * @returns {string|null} The view count string or null
   */
  _extractViewCount(video) {
    if (video.view_count) {
      return typeof video.view_count === 'string'
        ? video.view_count
        : video.view_count.text || video.view_count.simple_text;
    } else if (video.view_count_text) {
      return typeof video.view_count_text === 'string'
        ? video.view_count_text
        : video.view_count_text.text || video.view_count_text.simple_text;
    }
    return null;
  }

  /**
   * Processes a list of video objects and extracts video information.
   *
   * @private
   * @param {Array} videoList - Array of video objects from YouTube API
   * @param {number|null} maxResults - Maximum number of videos to process
   * @returns {Array<{videoId: string, title: string, publishedAt: string|null, viewCount: string|null}>}
   */
  _processVideoList(videoList, maxResults = null) {
    const videos = [];
    for (const video of videoList) {
      const videoId = this._extractVideoIdFromObject(video);
      if (videoId) {
        videos.push({
          videoId,
          title: this._extractTitleFromVideo(video),
          publishedAt: this._extractPublishedDate(video),
          viewCount: this._extractViewCount(video)
        });

        if (maxResults && videos.length >= maxResults) {
          break;
        }
      }
    }
    return videos;
  }

  /**
   * Fetches all videos from a YouTube channel.
   *
   * Uses the uploads playlist method for better pagination support,
   * with a fallback to direct channel video access.
   *
   * @param {string} channelIdentifier - Channel ID, handle, or URL
   * @param {number|null} [maxResults=null] - Maximum number of videos to return (null for all)
   * @returns {Promise<{success: boolean, data: {channelName: string, channelIdentifier: string, totalVideos: number, videos: Array}}>}
   * @throws {Error} If the channel cannot be found or accessed
   */
  async fetchChannelVideos(channelIdentifier, maxResults = null) {
    try {
      const youtube = await this.initYouTube();
      const channelInfo = this.extractChannelId(channelIdentifier);

      if (!channelInfo) {
        throw new Error('Invalid channel ID, handle, or URL');
      }

      // Get channel object
      let channel;
      let channelId = null;

      if (channelInfo.type === 'handle') {
        // For handles/URLs, use resolveURL to get channel ID
        try {
          const urlToResolve = channelIdentifier.startsWith('http')
            ? channelIdentifier
            : `https://www.youtube.com/${channelInfo.value}`;

          const resolved = await youtube.resolveURL(urlToResolve);

          if (resolved && resolved.type === 'channel') {
            channel = resolved;
            channelId = resolved.id || channelInfo.value;
          } else if (resolved && resolved.channel) {
            channel = resolved.channel;
            channelId = resolved.channel.id || channelInfo.value;
          } else if (resolved && resolved.metadata?.channel_id) {
            channelId = resolved.metadata.channel_id;
            channel = await youtube.getChannel(channelId);
          } else {
            throw new Error('Could not resolve channel from handle/URL');
          }
        } catch (resolveError) {
          throw new Error(`Could not resolve channel: ${resolveError.message}`);
        }
      } else {
        // Direct channel ID - use getChannel
        channelId = channelInfo.value;
        channel = await youtube.getChannel(channelId);
      }

      if (!channel) {
        throw new Error('Channel not found');
      }

      // Get channel name from various possible locations
      const channelName = channel.header?.title?.text
        || channel.title?.text
        || channel.metadata?.title?.text
        || channel.author?.name
        || 'Unknown Channel';

      let videos = [];

      // Use the uploads playlist method for better pagination support
      // Uploads playlist ID is UU + channel ID (replace UC with UU)
      const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');

      let playlist;
      try {
        playlist = await youtube.getPlaylist(uploadsPlaylistId);
      } catch (playlistError) {
        // Fallback to direct channel.videos if playlist fails
        console.error('Playlist approach failed, trying direct channel videos:', playlistError.message);

        let allVideos = [];
        if (channel.videos && Array.isArray(channel.videos)) {
          allVideos = channel.videos;
        } else if (channel.contents && Array.isArray(channel.contents)) {
          allVideos = channel.contents;
        } else {
          throw new Error('Could not access channel videos - both playlist and direct methods failed');
        }

        videos = this._processVideoList(allVideos, maxResults);

        return {
          success: true,
          data: {
            channelName,
            channelIdentifier: channelId || channelInfo.value,
            totalVideos: videos.length,
            videos
          }
        };
      }

      // Process videos from playlist with pagination
      let allVideos = [];

      if (playlist.videos && Array.isArray(playlist.videos)) {
        allVideos = [...playlist.videos];
      } else if (playlist.contents && Array.isArray(playlist.contents)) {
        allVideos = [...playlist.contents];
      }

      // Process initial batch of videos
      videos = this._processVideoList(allVideos, maxResults);

      // Handle pagination if available and needed
      if ((!maxResults || videos.length < maxResults) && playlist.has_continuation && typeof playlist.getContinuation === 'function') {
        try {
          let continuation = playlist.has_continuation;
          while (continuation && (!maxResults || videos.length < maxResults)) {
            const moreData = await playlist.getContinuation();
            if (!moreData || !moreData.videos) break;

            const moreVideos = Array.isArray(moreData.videos) ? moreData.videos : moreData.contents || [];
            const remainingSlots = maxResults ? maxResults - videos.length : null;
            const newVideos = this._processVideoList(moreVideos, remainingSlots);
            videos.push(...newVideos);

            continuation = moreData.has_continuation;
          }
        } catch (paginationError) {
          // Pagination failed, but we still have the initial videos
          console.error('Pagination error (non-fatal):', paginationError.message);
        }
      }

      return {
        success: true,
        data: {
          channelName,
          channelIdentifier: channelId || channelInfo.value,
          totalVideos: videos.length,
          videos
        }
      };
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  }

  /**
   * Fetches the transcript for a YouTube video.
   *
   * Uses a Python script with youtube_transcript_api for reliable transcript fetching,
   * and youtubei.js for fetching the video title.
   *
   * @param {string} videoId - The YouTube video ID
   * @param {string} [language='en'] - Language code for the transcript
   * @returns {Promise<{success: boolean, data: {videoId: string, title: string, transcript: Array, language: string}}>}
   * @throws {Error} If the transcript cannot be fetched
   */
  async fetchTranscriptDirect(videoId, language = 'en') {
    try {
      // Get video title using youtubei.js
      let title = 'Unknown Video';
      try {
        const youtube = await this.initYouTube();
        const info = await youtube.getInfo(videoId);
        title = info?.basic_info?.title || 'Unknown Video';
      } catch (titleError) {
        console.error('Could not fetch video title:', titleError.message);
      }

      // Use Python script to fetch transcript (more reliable)
      const scriptPath = path.join(__dirname, 'scripts', 'fetch_transcript.py');

      const { stdout, stderr } = await execFilePromise('python3', [
        scriptPath,
        videoId,
        language
      ], { timeout: 30000 });

      if (stderr) {
        console.error('Python stderr:', stderr);
      }

      const result = JSON.parse(stdout);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transcript');
      }

      // Add title to the result
      result.data.title = title;

      return result;
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  }

  /**
   * Formats transcript data into a human-readable response.
   *
   * @param {Object} data - Transcript data object
   * @param {boolean} data.success - Whether the fetch was successful
   * @param {Object} data.data - The transcript data
   * @param {string} data.data.title - Video title
   * @param {Array} data.data.transcript - Array of transcript segments
   * @param {Object} [options={}] - Formatting options
   * @param {number} [options.page=1] - Page number for pagination
   * @param {number} [options.maxItems=50] - Maximum items per page
   * @returns {string} Formatted transcript response
   */
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

  /**
   * Formats seconds into a human-readable timestamp.
   *
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted timestamp (e.g., "1:23" or "1:02:34")
   *
   * @example
   * formatTimestamp(83) // "1:23"
   * formatTimestamp(3754) // "1:02:34"
   */
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Sets up the MCP request handlers for the available tools.
   *
   * @private
   */
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
        },
        {
          name: 'get_channel_videos',
          description: 'Extract all video IDs from a YouTube channel. Supports channel URLs, handles (@username), and channel IDs.',
          inputSchema: {
            type: 'object',
            properties: {
              channel: {
                type: 'string',
                description: 'YouTube channel ID, handle (@username), or URL (e.g., "@channelname", "UC...", "https://www.youtube.com/channel/UC..." or "https://www.youtube.com/@channelname")'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of video IDs to return (default: null, returns all videos)',
                default: null
              },
              format: {
                type: 'string',
                enum: ['list', 'ids_only', 'detailed'],
                description: 'Response format: "list" (formatted list), "ids_only" (just video IDs), "detailed" (with titles and metadata). Default: "detailed"',
                default: 'detailed'
              }
            },
            required: ['channel']
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

          case 'get_channel_videos': {
            const data = await this.fetchChannelVideos(args.channel, args.maxResults || null);

            if (!data.success || !data.data) {
              throw new Error('Could not retrieve channel videos');
            }

            const { channelName, totalVideos, videos } = data.data;
            const format = args.format || 'detailed';

            if (format === 'ids_only') {
              const videoIds = videos.map(v => v.videoId).join('\n');
              return {
                content: [
                  {
                    type: 'text',
                    text: `# Video IDs from ${channelName}\n\nTotal: ${totalVideos}\n\n${videoIds}`
                  }
                ]
              };
            }

            if (format === 'list') {
              let response = `# Video IDs from ${channelName}\n\nTotal: ${totalVideos}\n\n`;
              videos.forEach((video, index) => {
                response += `${index + 1}. ${video.videoId}\n`;
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

            // detailed format (default)
            let response = `# Videos from ${channelName}\n\n`;
            response += `**Total Videos:** ${totalVideos}\n\n`;

            videos.forEach((video, index) => {
              response += `## ${index + 1}. ${video.title || 'Untitled'}\n`;
              response += `- **Video ID:** ${video.videoId}\n`;
              response += `- **URL:** https://www.youtube.com/watch?v=${video.videoId}\n`;
              if (video.publishedAt) {
                response += `- **Published:** ${video.publishedAt}\n`;
              }
              if (video.viewCount) {
                response += `- **Views:** ${video.viewCount}\n`;
              }
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

  /**
   * Starts the MCP server using stdio transport.
   *
   * @returns {Promise<void>}
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('YouTube Transcript MCP server running...');
  }
}

// Only start the MCP server when executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const server = new YouTubeTranscriptServer();
  server.run().catch(console.error);
}
