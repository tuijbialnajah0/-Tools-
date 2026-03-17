import fs from 'fs';
const text = fs.readFileSync('google.html', 'utf8');
const urls = [...text.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|png|jpeg)/gi)];
console.log('Found:', urls.length);
if (urls.length > 0) {
  console.log(urls.slice(0, 10).map(m => m[0]));
}
