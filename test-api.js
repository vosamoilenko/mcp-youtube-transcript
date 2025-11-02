import fetch from 'node-fetch';

const API_URL = 'https://youtube-transcript.vercel.app/api/transcript';

async function testAPI() {
  console.log('Testing YouTube Transcript API...\n');

  // Test with a known video ID (Rick Astley - Never Gonna Give You Up)
  const testVideoId = 'dQw4w9WgXcQ';

  try {
    // Test 1: Get paginated transcript
    console.log('Test 1: Fetching paginated transcript...');
    const response1 = await fetch(`${API_URL}?videoId=${testVideoId}&maxItems=5&page=1`);
    const data1 = await response1.json();

    if (data1.success) {
      console.log('✓ Paginated transcript fetched successfully');
      console.log(`  Title: ${data1.data.title}`);
      console.log(`  Items: ${data1.data.transcript.length}`);
      console.log(`  Total pages: ${data1.data.pagination.totalPages}\n`);
    } else {
      console.log('✗ Failed to fetch paginated transcript\n');
    }

    // Test 2: Get text format
    console.log('Test 2: Fetching text format...');
    const response2 = await fetch(`${API_URL}?videoId=${testVideoId}&format=text&maxItems=10`);
    const text = await response2.text();

    if (response2.ok) {
      console.log('✓ Text format fetched successfully');
      console.log(`  Text preview: ${text.substring(0, 100)}...\n`);
    } else {
      console.log('✗ Failed to fetch text format\n');
    }

    // Test 3: Test with invalid video ID
    console.log('Test 3: Testing error handling with invalid ID...');
    const response3 = await fetch(`${API_URL}?videoId=invalid123`);
    const data3 = await response3.json();

    if (!response3.ok && data3.error) {
      console.log('✓ Error handling works correctly');
      console.log(`  Error: ${data3.error}\n`);
    } else {
      console.log('✗ Error handling not working as expected\n');
    }

    console.log('API tests completed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAPI();