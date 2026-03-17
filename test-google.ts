import fetch from 'node-fetch';
(async () => {
  const url = 'https://www.google.com/search?q=anime+character&tbm=isch';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  console.log('Google status:', res.status);
  const text = await res.text();
  console.log('Google text length:', text.length);
  const snippets = [...text.matchAll(/\["([^"]+\.(?:jpg|png|jpeg))",\d+,\d+\]/gi)];
  console.log('Snippets:', snippets.length);
  if (snippets.length > 0) {
    console.log(snippets.slice(0, 5).map(m => m[1]));
  }
})();
