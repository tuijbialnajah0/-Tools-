import fetch from 'node-fetch';
(async () => {
  const url = 'https://yandex.com/images/search?text=anime+character';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });
  console.log('Yandex status:', res.status);
  const text = await res.text();
  console.log('Yandex text length:', text.length);
})();
