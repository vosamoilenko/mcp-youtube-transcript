import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeTranscriptServer } from '../index.js';

describe('formatTranscriptResponse', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeTranscriptServer();
  });

  const createMockData = (title, segments) => ({
    success: true,
    data: {
      title,
      transcript: segments
    }
  });

  const mockSegments = [
    { text: 'Hello world', start: 0, duration: 2 },
    { text: 'This is a test', start: 2, duration: 3 },
    { text: 'Of the transcript', start: 5, duration: 2 },
    { text: 'Formatting function', start: 7, duration: 3 },
    { text: 'It should work well', start: 10, duration: 2 }
  ];

  describe('basic formatting', () => {
    it('should format transcript with title', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data);

      expect(result).toContain('# Test Video');
    });

    it('should include timestamps for each segment', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data);

      expect(result).toContain('[0:00]');
      expect(result).toContain('[0:02]');
      expect(result).toContain('[0:05]');
    });

    it('should include segment text', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data);

      expect(result).toContain('Hello world');
      expect(result).toContain('This is a test');
    });

    it('should use default title when not provided', () => {
      const data = createMockData(null, mockSegments);
      const result = server.formatTranscriptResponse(data);

      expect(result).toContain('# YouTube Video Transcript');
    });
  });

  describe('pagination', () => {
    it('should paginate with default maxItems of 50', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data, { page: 1, maxItems: 50 });

      expect(result).toContain('Page 1 of 1');
      expect(result).toContain('Items: 5 | Total: 5');
    });

    it('should paginate with custom maxItems', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data, { page: 1, maxItems: 2 });

      expect(result).toContain('Page 1 of 3');
      expect(result).toContain('Items: 2 | Total: 5');
      expect(result).toContain('Hello world');
      expect(result).toContain('This is a test');
      expect(result).not.toContain('Of the transcript');
    });

    it('should show correct content on page 2', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data, { page: 2, maxItems: 2 });

      expect(result).toContain('Page 2 of 3');
      expect(result).toContain('Of the transcript');
      expect(result).toContain('Formatting function');
      expect(result).not.toContain('Hello world');
    });

    it('should show next page message when more pages available', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data, { page: 1, maxItems: 2 });

      expect(result).toContain('Next page available (page 2)');
    });

    it('should not show next page message on last page', () => {
      const data = createMockData('Test Video', mockSegments);
      const result = server.formatTranscriptResponse(data, { page: 3, maxItems: 2 });

      expect(result).not.toContain('Next page available');
    });
  });

  describe('error handling', () => {
    it('should return message for unsuccessful data', () => {
      const data = { success: false };
      const result = server.formatTranscriptResponse(data);

      expect(result).toBe('No transcript available');
    });

    it('should return message for missing data', () => {
      const data = { success: true, data: null };
      const result = server.formatTranscriptResponse(data);

      expect(result).toBe('No transcript available');
    });
  });

  describe('empty transcript', () => {
    it('should handle empty transcript array', () => {
      const data = createMockData('Test Video', []);
      const result = server.formatTranscriptResponse(data, { page: 1, maxItems: 50 });

      expect(result).toContain('# Test Video');
      expect(result).toContain('Page 1 of 0');
      expect(result).toContain('Items: 0 | Total: 0');
    });
  });
});
