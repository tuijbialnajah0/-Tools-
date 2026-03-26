const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = ['OfflineBackgroundRemover.tsx', 'HtmlViewer.tsx', 'TextToImage.tsx', 'CodeBase.tsx', 'NotesViewer.tsx'];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/flex flex-col h-full/g, 'flex-1 flex flex-col min-h-0');
    newContent = newContent.replace(/h-full flex flex-col/g, 'flex-1 flex flex-col min-h-0');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
