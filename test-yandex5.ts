import fetch from 'node-fetch';
(async () => {
  const query = 'anime character';
  const start = 0;
  const yandexUrl = `https://yandex.com/images/search?text=${encodeURIComponent(query)}&p=${Math.floor(start/30)}`;
  const res = await fetch(yandexUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  
  // Parse JSON objects from HTML
  const items = [...html.matchAll(/&quot;img_href&quot;:&quot;([^&]+)&quot;/gi)];
  const thumbs = [...html.matchAll(/&quot;image&quot;:&quot;([^&]+)&quot;/gi)];
  
  console.log('Images found:', items.length);
  console.log('Thumbs found:', thumbs.length);
  
  if (items.length > 0 && thumbs.length > 0) {
    console.log(items[0][1]);
    console.log(thumbs[0][1]);
  }
})();
