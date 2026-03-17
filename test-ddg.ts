import fetch from 'node-fetch';
(async () => {
  const res = await fetch('https://duckduckgo.com/?q=anime+character');
  const text = await res.text();
  let vqdMatch = text.match(/vqd=([^&'\"]+)/);
  if (!vqdMatch) vqdMatch = text.match(/vqd\s*[:=]\s*['\"]([^'\"]+)['\"]/);
  console.log('VQD Match:', vqdMatch ? vqdMatch[1] : 'Not found');
})();
