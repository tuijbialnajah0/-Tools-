import fetch from 'node-fetch';
(async () => {
  const url = 'https://duckduckgo.com/?q=anime+character';
  const proxyUrl = 'https://thingproxy.freeboard.io/fetch/' + encodeURIComponent(url);
  const res = await fetch(proxyUrl);
  console.log('Proxy status:', res.status);
  const text = await res.text();
  console.log('Proxy text length:', text.length);
})();
