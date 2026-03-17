import fetch from 'node-fetch';
(async () => {
  const url = 'https://images.search.yahoo.com/search/images?p=anime+character';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  console.log('Yahoo status:', res.status);
  const text = await res.text();
  console.log('Yahoo text length:', text.length);
  const snippets = [...text.matchAll(/<li class="ld"[^>]*data-url="([^"]+)"[^>]*data-title="([^"]+)"/gi)];
  console.log('Snippets:', snippets.length);
  if (snippets.length > 0) {
    console.log(snippets[0][1]);
  }
})();
