#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YouTubeTranscriptServer } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const channel = process.argv[2];
  if (!channel) {
    console.error('Usage: node export-channel-videos.js <channel-id-or-url-or-@handle> [output.json]');
    process.exit(1);
  }

  const outArg = process.argv[3];
  const defaultNameSafe = channel.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const outPath = path.resolve(__dirname, outArg || `${defaultNameSafe}.videos.json`);

  const yt = new YouTubeTranscriptServer();
  try {
    const result = await yt.fetchChannelVideos(channel, null);
    if (!result.success || !result.data) {
      throw new Error('Failed to fetch channel videos');
    }

    const { videos, channelName } = result.data;
    // Build an ordered object: videoId -> title (in channel order)
    const ordered = {};
    for (const v of videos) {
      ordered[v.videoId] = v.title || 'Untitled';
    }

    fs.writeFileSync(outPath, JSON.stringify(ordered, null, 2), 'utf8');
    console.log(`Wrote ${videos.length} videos from ${channelName} to: ${outPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(2);
  }
}

main();
