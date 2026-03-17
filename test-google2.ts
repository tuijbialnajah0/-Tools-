import fetch from 'node-fetch';
import fs from 'fs';
(async () => {
  const url = 'https://www.google.com/search?q=anime+character&tbm=isch';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  const text = await res.text();
  fs.writeFileSync('google.html', text);
  console.log('Saved to google.html');
})();
