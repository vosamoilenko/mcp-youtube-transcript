import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeTranscriptServer } from '../index.js';

describe('extractVideoId', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeTranscriptServer();
  });

  describe('direct video IDs', () => {
    it('should extract a valid 11-character video ID', () => {
      expect(server.extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID with underscores', () => {
      expect(server.extractVideoId('abc_def_123')).toBe('abc_def_123');
    });

    it('should extract video ID with hyphens', () => {
      expect(server.extractVideoId('abc-def-123')).toBe('abc-def-123');
    });

    it('should return null for IDs shorter than 11 characters', () => {
      expect(server.extractVideoId('dQw4w9WgXc')).toBeNull();
    });

    it('should return null for IDs longer than 11 characters', () => {
      expect(server.extractVideoId('dQw4w9WgXcQQ')).toBeNull();
    });

    it('should return null for IDs with invalid characters', () => {
      expect(server.extractVideoId('dQw4w9WgXc!')).toBeNull();
    });
  });

  describe('standard YouTube URLs', () => {
    it('should extract ID from youtube.com/watch?v= URL', () => {
      expect(server.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/watch?v= URL with additional params', () => {
      expect(server.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/watch?v= URL with params before v', () => {
      expect(server.extractVideoId('https://www.youtube.com/watch?list=PLtest&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from URL without www', () => {
      expect(server.extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from HTTP URL', () => {
      expect(server.extractVideoId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('short YouTube URLs (youtu.be)', () => {
    it('should extract ID from youtu.be URL', () => {
      expect(server.extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be URL with timestamp', () => {
      expect(server.extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=120')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be URL without protocol', () => {
      expect(server.extractVideoId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('embed URLs', () => {
    it('should extract ID from youtube.com/embed/ URL', () => {
      expect(server.extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/v/ URL', () => {
      expect(server.extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/e/ URL', () => {
      expect(server.extractVideoId('https://www.youtube.com/e/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(server.extractVideoId('')).toBeNull();
    });

    it('should return null for non-YouTube URL', () => {
      expect(server.extractVideoId('https://vimeo.com/123456789')).toBeNull();
    });

    it('should return null for YouTube URL without video ID', () => {
      expect(server.extractVideoId('https://www.youtube.com/')).toBeNull();
    });

    it('should return null for YouTube channel URL', () => {
      expect(server.extractVideoId('https://www.youtube.com/@channelname')).toBeNull();
    });

    it('should handle URL with trailing slash', () => {
      expect(server.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ/')).toBe('dQw4w9WgXcQ');
    });
  });
});
