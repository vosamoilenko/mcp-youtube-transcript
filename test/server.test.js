import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeTranscriptServer } from '../index.js';

describe('YouTubeTranscriptServer', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeTranscriptServer();
  });

  describe('constructor', () => {
    it('should create server instance', () => {
      expect(server).toBeInstanceOf(YouTubeTranscriptServer);
    });

    it('should have server property', () => {
      expect(server.server).toBeDefined();
    });

    it('should have youtube property initialized as null', () => {
      expect(server.youtube).toBeNull();
    });
  });

  describe('initYouTube', () => {
    it('should initialize YouTube client', async () => {
      const youtube = await server.initYouTube();
      expect(youtube).toBeDefined();
      expect(server.youtube).toBe(youtube);
    });

    it('should return same instance on subsequent calls', async () => {
      const youtube1 = await server.initYouTube();
      const youtube2 = await server.initYouTube();
      expect(youtube1).toBe(youtube2);
    });
  });

  describe('MCP server configuration', () => {
    it('should have server instance from MCP SDK', () => {
      expect(server.server).toBeDefined();
      expect(typeof server.server.setRequestHandler).toBe('function');
    });

    it('should have connect method for transport', () => {
      expect(typeof server.server.connect).toBe('function');
    });
  });
});
