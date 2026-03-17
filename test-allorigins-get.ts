import fetch from 'node-fetch';
(async () => {
  const url = 'https://duckduckgo.com/?q=anime+character';
  const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
  const res = await fetch(proxyUrl);
  console.log('Proxy status:', res.status);
  const json = await res.json();
  console.log('Proxy json contents length:', json.contents.length);
})();
