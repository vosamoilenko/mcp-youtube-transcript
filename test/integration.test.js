import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YouTubeTranscriptServer } from '../index.js';

describe('Integration Tests', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeTranscriptServer();
  });

  describe('fetchTranscriptDirect', () => {
    it('should fetch transcript for a known video', async () => {
      // Using a well-known video that's unlikely to be removed
      // Rick Astley - Never Gonna Give You Up
      const result = await server.fetchTranscriptDirect('dQw4w9WgXcQ', 'en');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.videoId).toBe('dQw4w9WgXcQ');
      expect(result.data.transcript).toBeInstanceOf(Array);
      expect(result.data.transcript.length).toBeGreaterThan(0);
      expect(result.data.title).toBeDefined();
    }, 30000); // 30 second timeout for network request

    it('should return transcript segments with correct structure', async () => {
      const result = await server.fetchTranscriptDirect('dQw4w9WgXcQ', 'en');

      expect(result.success).toBe(true);
      const segment = result.data.transcript[0];
      expect(segment).toHaveProperty('text');
      expect(segment).toHaveProperty('start');
      expect(segment).toHaveProperty('duration');
      expect(typeof segment.text).toBe('string');
      expect(typeof segment.start).toBe('number');
      expect(typeof segment.duration).toBe('number');
    }, 30000);

    it('should throw error for invalid video ID', async () => {
      await expect(server.fetchTranscriptDirect('invalidvideo', 'en'))
        .rejects.toThrow();
    }, 30000);

    it('should throw error for non-existent video', async () => {
      await expect(server.fetchTranscriptDirect('xxxxxxxxxxx', 'en'))
        .rejects.toThrow();
    }, 30000);
  });

  describe('fetchChannelVideos', () => {
    it('should fetch videos from a known channel by handle', async () => {
      // Using YouTube's official channel which should always exist
      const result = await server.fetchChannelVideos('@YouTube', 5);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.videos).toBeInstanceOf(Array);
      expect(result.data.videos.length).toBeLessThanOrEqual(5);
      expect(result.data.channelName).toBeDefined();
    }, 60000); // 60 second timeout for channel fetching

    it('should return video objects with correct structure', async () => {
      const result = await server.fetchChannelVideos('@YouTube', 1);

      expect(result.success).toBe(true);
      if (result.data.videos.length > 0) {
        const video = result.data.videos[0];
        expect(video).toHaveProperty('videoId');
        expect(video).toHaveProperty('title');
        expect(typeof video.videoId).toBe('string');
        expect(video.videoId.length).toBe(11);
      }
    }, 60000);

    it('should throw error for invalid channel', async () => {
      await expect(server.fetchChannelVideos('!@#$%^&*()', null))
        .rejects.toThrow();
    }, 30000);

    it('should respect maxResults parameter', async () => {
      const result = await server.fetchChannelVideos('@YouTube', 3);

      expect(result.success).toBe(true);
      expect(result.data.videos.length).toBeLessThanOrEqual(3);
    }, 60000);
  });

  describe('end-to-end workflow', () => {
    it('should extract video ID from URL and fetch transcript', async () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const videoId = server.extractVideoId(url);

      expect(videoId).toBe('dQw4w9WgXcQ');

      const result = await server.fetchTranscriptDirect(videoId, 'en');
      expect(result.success).toBe(true);

      const formatted = server.formatTranscriptResponse(result, { page: 1, maxItems: 10 });
      expect(formatted).toContain('Page 1');
      expect(formatted).toContain('[0:');
    }, 30000);
  });
});
