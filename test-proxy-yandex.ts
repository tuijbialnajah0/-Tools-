import fetch from 'node-fetch';
(async () => {
  const url = 'https://yandex.com/images/search?text=anime+character';
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  const res = await fetch(proxyUrl);
  console.log('Proxy status:', res.status);
  const text = await res.text();
  console.log('Proxy text length:', text.length);
})();
