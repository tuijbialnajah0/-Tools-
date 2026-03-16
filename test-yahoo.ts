import https from 'https';

async function test() {
  const query = "anime";
  const targetUrl = `https://yandex.com/images/search?text=${encodeURIComponent(query)}&p=1`;
  const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  }, (res) => {
    console.log("Status:", res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("HTML length:", data.length);
      const matches = [...new Set([...data.matchAll(/img_url=([^&]+)/gi)].map(m => decodeURIComponent(m[1])))];
      console.log("Found", matches.length, "images");
      console.log(matches.slice(0, 5));
    });
  });
}
test();