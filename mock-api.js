import express from 'express';

const app = express();
const PORT = 3000;

// Mock transcript data
const mockTranscript = {
  success: true,
  data: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
    language: 'en',
    transcript: [
      { text: "We're no strangers to love", start: 0, duration: 2.5 },
      { text: "You know the rules and so do I", start: 2.5, duration: 2.8 },
      { text: "A full commitment's what I'm thinking of", start: 5.3, duration: 3.2 },
      { text: "You wouldn't get this from any other guy", start: 8.5, duration: 3.5 },
      { text: "I just wanna tell you how I'm feeling", start: 12, duration: 3 },
      { text: "Gotta make you understand", start: 15, duration: 2.5 },
      { text: "Never gonna give you up", start: 17.5, duration: 2 },
      { text: "Never gonna let you down", start: 19.5, duration: 2 },
      { text: "Never gonna run around and desert you", start: 21.5, duration: 3 },
      { text: "Never gonna make you cry", start: 24.5, duration: 2 },
      { text: "Never gonna say goodbye", start: 26.5, duration: 2 },
      { text: "Never gonna tell a lie and hurt you", start: 28.5, duration: 3 }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 50,
      totalItems: 12,
      itemsInPage: 12,
      hasNextPage: false,
      hasPreviousPage: false
    }
  },
  metadata: {
    cached: false,
    responseTime: 150
  },
  timestamp: new Date().toISOString()
};

app.get('/api/transcript', (req, res) => {
  const { videoId, page = 1, maxItems = 50, format } = req.query;

  if (!videoId) {
    return res.status(400).json({
      error: 'Video ID is required',
      usage: '/api/transcript?videoId=VIDEO_ID'
    });
  }

  if (videoId === 'invalid123') {
    return res.status(400).json({
      error: 'Invalid video ID format',
      message: 'Video ID must be 11 characters long'
    });
  }

  // Return text format if requested
  if (format === 'text') {
    const plainText = mockTranscript.data.transcript
      .map(item => item.text)
      .join(' ');
    res.setHeader('Content-Type', 'text/plain');
    return res.send(plainText);
  }

  // Handle pagination
  const pageNum = parseInt(page);
  const itemsPerPage = parseInt(maxItems);
  const startIndex = (pageNum - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedTranscript = mockTranscript.data.transcript.slice(startIndex, endIndex);

  res.json({
    ...mockTranscript,
    data: {
      ...mockTranscript.data,
      transcript: paginatedTranscript,
      pagination: {
        ...mockTranscript.data.pagination,
        currentPage: pageNum,
        itemsPerPage,
        itemsInPage: paginatedTranscript.length
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/transcript?videoId=dQw4w9WgXcQ`);
});