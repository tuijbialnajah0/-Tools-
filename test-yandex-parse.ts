import fs from 'fs';
const text = fs.readFileSync('yandex.html', 'utf8');
const snippets = [...text.matchAll(/"img_href":"([^"]+)"/gi)];
console.log('Snippets:', snippets.length);
if (snippets.length > 0) {
  console.log(snippets.slice(0, 5).map(m => m[1]));
}
