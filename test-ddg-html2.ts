import fetch from 'node-fetch';
(async () => {
  const url = 'https://duckduckgo.com/html/?q=anime+character';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  const text = await res.text();
  console.log('HTML length:', text.length);
  const images = [...text.matchAll(/<img[^>]+src="([^"]+)"/gi)];
  console.log('Images found:', images.length);
  if (images.length > 0) {
    console.log(images.slice(0, 5).map(m => m[1]));
  }
})();
