import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeTranscriptServer } from '../index.js';

describe('extractChannelId', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeTranscriptServer();
  });

  describe('handle format (@username)', () => {
    it('should extract handle starting with @', () => {
      const result = server.extractChannelId('@MrBeast');
      expect(result).toEqual({ type: 'handle', value: '@MrBeast' });
    });

    it('should extract handle with numbers', () => {
      const result = server.extractChannelId('@channel123');
      expect(result).toEqual({ type: 'handle', value: '@channel123' });
    });

    it('should extract handle with underscores', () => {
      const result = server.extractChannelId('@my_channel');
      expect(result).toEqual({ type: 'handle', value: '@my_channel' });
    });

    it('should extract handle with hyphens', () => {
      const result = server.extractChannelId('@my-channel');
      expect(result).toEqual({ type: 'handle', value: '@my-channel' });
    });
  });

  describe('channel ID format', () => {
    it('should extract UC channel ID (24 characters)', () => {
      const result = server.extractChannelId('UCX6OQ3DkcsbYNE6H8uQQuVA');
      expect(result).toEqual({ type: 'id', value: 'UCX6OQ3DkcsbYNE6H8uQQuVA' });
    });

    it('should extract generic 24-character channel ID', () => {
      const result = server.extractChannelId('HCabcdefghij1234567890AB');
      expect(result).toEqual({ type: 'id', value: 'HCabcdefghij1234567890AB' });
    });
  });

  describe('channel URLs', () => {
    it('should extract channel ID from /channel/ URL', () => {
      const result = server.extractChannelId('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA');
      expect(result).toEqual({ type: 'id', value: 'UCX6OQ3DkcsbYNE6H8uQQuVA' });
    });

    it('should extract handle from /@username URL', () => {
      const result = server.extractChannelId('https://www.youtube.com/@MrBeast');
      expect(result).toEqual({ type: 'handle', value: '@MrBeast' });
    });

    it('should extract handle from /c/ URL', () => {
      const result = server.extractChannelId('https://www.youtube.com/c/MrBeast');
      expect(result).toEqual({ type: 'handle', value: '@MrBeast' });
    });

    it('should extract handle from /user/ URL', () => {
      const result = server.extractChannelId('https://www.youtube.com/user/PewDiePie');
      expect(result).toEqual({ type: 'handle', value: '@PewDiePie' });
    });

    it('should handle URL without www', () => {
      const result = server.extractChannelId('https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA');
      expect(result).toEqual({ type: 'id', value: 'UCX6OQ3DkcsbYNE6H8uQQuVA' });
    });

    it('should handle HTTP URL', () => {
      const result = server.extractChannelId('http://www.youtube.com/@MrBeast');
      expect(result).toEqual({ type: 'handle', value: '@MrBeast' });
    });
  });

  describe('plain username (without @)', () => {
    it('should convert plain username to handle format', () => {
      const result = server.extractChannelId('MrBeast');
      expect(result).toEqual({ type: 'handle', value: '@MrBeast' });
    });

    it('should convert username with numbers to handle format', () => {
      const result = server.extractChannelId('channel123');
      expect(result).toEqual({ type: 'handle', value: '@channel123' });
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(server.extractChannelId('')).toBeNull();
    });

    it('should return null for invalid input with special characters', () => {
      expect(server.extractChannelId('channel!@#$')).toBeNull();
    });

    it('should return null for video URL', () => {
      // Video URLs should not be parsed as channel identifiers
      const result = server.extractChannelId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toBeNull();
    });
  });
});
