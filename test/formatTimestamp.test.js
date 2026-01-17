import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeTranscriptServer } from '../index.js';

describe('formatTimestamp', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeTranscriptServer();
  });

  describe('seconds only (< 1 minute)', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(server.formatTimestamp(0)).toBe('0:00');
    });

    it('should format single digit seconds with padding', () => {
      expect(server.formatTimestamp(5)).toBe('0:05');
    });

    it('should format double digit seconds', () => {
      expect(server.formatTimestamp(45)).toBe('0:45');
    });

    it('should format 59 seconds', () => {
      expect(server.formatTimestamp(59)).toBe('0:59');
    });
  });

  describe('minutes and seconds (< 1 hour)', () => {
    it('should format 1 minute', () => {
      expect(server.formatTimestamp(60)).toBe('1:00');
    });

    it('should format 1 minute 30 seconds', () => {
      expect(server.formatTimestamp(90)).toBe('1:30');
    });

    it('should format 10 minutes', () => {
      expect(server.formatTimestamp(600)).toBe('10:00');
    });

    it('should format 59 minutes 59 seconds', () => {
      expect(server.formatTimestamp(3599)).toBe('59:59');
    });

    it('should pad seconds in minute range', () => {
      expect(server.formatTimestamp(65)).toBe('1:05');
    });
  });

  describe('hours, minutes, and seconds', () => {
    it('should format 1 hour', () => {
      expect(server.formatTimestamp(3600)).toBe('1:00:00');
    });

    it('should format 1 hour 30 minutes', () => {
      expect(server.formatTimestamp(5400)).toBe('1:30:00');
    });

    it('should format 1 hour 1 minute 1 second', () => {
      expect(server.formatTimestamp(3661)).toBe('1:01:01');
    });

    it('should format 2 hours 30 minutes 45 seconds', () => {
      expect(server.formatTimestamp(9045)).toBe('2:30:45');
    });

    it('should format 10 hours', () => {
      expect(server.formatTimestamp(36000)).toBe('10:00:00');
    });

    it('should pad minutes and seconds in hour range', () => {
      expect(server.formatTimestamp(3665)).toBe('1:01:05');
    });
  });

  describe('decimal seconds', () => {
    it('should floor decimal seconds', () => {
      expect(server.formatTimestamp(65.7)).toBe('1:05');
    });

    it('should handle very precise decimals', () => {
      expect(server.formatTimestamp(125.999)).toBe('2:05');
    });
  });

  describe('edge cases', () => {
    it('should handle very large timestamps', () => {
      // 100 hours
      expect(server.formatTimestamp(360000)).toBe('100:00:00');
    });

    it('should handle negative numbers', () => {
      // JavaScript Math.floor behavior with negatives produces odd results
      // The function doesn't validate input, so we just document the behavior
      const result = server.formatTimestamp(-5);
      expect(typeof result).toBe('string');
    });
  });
});
