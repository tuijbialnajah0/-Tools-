const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = ['OfflineBackgroundRemover.tsx', 'HtmlViewer.tsx', 'TextToImage.tsx', 'CodeBase.tsx', 'NotesViewer.tsx'];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/h-\[calc\(100vh-4rem\)\]/g, 'h-full');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
