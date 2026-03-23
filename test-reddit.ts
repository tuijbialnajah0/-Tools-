async function test() {
  const query = 'cats site:reddit.com';
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_`, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const text = await tokenRes.text();
    const vqdMatch = text.match(/vqd=['"]([^'"]+)['"]/) || text.match(/vqd=([^&"']+)/);
    if (!vqdMatch) {
      console.log('No vqd');
      return;
    }
    const vqd = vqdMatch[1];
    const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
    const searchRes = await fetch(searchUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Referer": "https://duckduckgo.com/"
      }
    });
    const data = await searchRes.json();
    console.log(`DDG Reddit results:`, data.results?.length);
    if (data.results?.length > 0) {
      console.log('Sample Result:', JSON.stringify(data.results[0], null, 2));
    }
  } catch (e) {
    console.error(`DDG error:`, e.message);
  }
}
test();
