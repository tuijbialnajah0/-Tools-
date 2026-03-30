
async function testApi() {
  const imageUrl = 'https://picsum.photos/200/300';
  const apiUrl = `https://image-enhance.apis-bj-devs.workers.dev/?imageurl=${encodeURIComponent(imageUrl)}`;
  
  console.log(`Testing API: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log(`Response size: ${buffer.byteLength} bytes`);
      if (buffer.byteLength > 0) {
        console.log('API seems to be working and returning data.');
      } else {
        console.log('API returned empty data.');
      }
    } else {
      const text = await response.text();
      console.log(`Error response: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testApi();
