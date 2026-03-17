import fetch from 'node-fetch';
import fs from 'fs';
(async () => {
  const url = 'https://yandex.com/images/search?text=anime+character';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });
  const text = await res.text();
  fs.writeFileSync('yandex.html', text);
  console.log('Saved to yandex.html');
})();
