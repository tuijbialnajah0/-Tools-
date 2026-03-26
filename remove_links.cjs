const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to match <Link to="/"> ... <ChevronLeft ... /> ... </Link>
  // or similar back links.
  const linkRegex1 = /<Link[^>]*to="\/"[^>]*>[\s\S]*?<ChevronLeft[^>]*>[\s\S]*?<\/Link>/g;
  const linkRegex2 = /<Link[^>]*to="\/"[^>]*>[\s\S]*?Back to Dashboard[\s\S]*?<\/Link>/g;
  
  let newContent = content.replace(linkRegex1, '');
  newContent = newContent.replace(linkRegex2, '');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
}
