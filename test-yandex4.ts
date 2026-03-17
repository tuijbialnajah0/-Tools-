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
  const snippets = [...html.matchAll(/&quot;img_href&quot;:&quot;([^&]+)&quot;/gi)];
  console.log('Images found:', snippets.length);
  if (snippets.length > 0) {
    console.log(snippets.slice(0, 5).map(m => m[1]));
  }
})();
