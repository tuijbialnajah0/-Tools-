import fetch from 'node-fetch';
(async () => {
  const url = 'https://lexica.art/api/v1/search?q=anime+character';
  const res = await fetch(url);
  console.log('Lexica status:', res.status);
  const json = await res.json();
  console.log('Lexica images:', json.images?.length);
  if (json.images?.length > 0) {
    console.log(json.images[0].src);
  }
})();
