import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, FileCode, Download, RefreshCw, Code2, X } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'ide-files-v3';

interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

const DEFAULT_FILES: ProjectFile[] = [
  { 
    name: 'index.html', 
    language: 'html', 
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Mini IDE</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>Hello World</h1>\n    <p>Welcome to your new fast IDE.</p>\n    <button id="btn">Click Me</button>\n  </div>\n  <script src="script.js"></script>\n</body>\n</html>' 
  },
  { 
    name: 'style.css', 
    language: 'css', 
    content: 'body {\n  font-family: system-ui, sans-serif;\n  background: #1e1e2e;\n  color: #fff;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.container {\n  text-align: center;\n  padding: 2rem;\n  background: #2a2a35;\n  border-radius: 12px;\n  box-shadow: 0 10px 30px rgba(0,0,0,0.5);\n}\n\nbutton {\n  background: #8b5cf6;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 6px;\n  cursor: pointer;\n  font-weight: bold;\n  margin-top: 1rem;\n}\n\nbutton:hover {\n  background: #7c3aed;\n}' 
  },
  { 
    name: 'script.js', 
    language: 'javascript', 
    content: 'document.getElementById("btn").addEventListener("click", () => {\n  alert("Button clicked! IDE is working perfectly.");\n});' 
  }
];

export function IDETool() {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [previewDoc, setPreviewDoc] = useState<string>('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFiles(JSON.parse(saved));
      } catch (e) {
        setFiles(DEFAULT_FILES);
      }
    } else {
      setFiles(DEFAULT_FILES);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save to local storage whenever files change (debounced)
  useEffect(() => {
    if (files.length > 0) {
      const timeout = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [files]);

  const handleEditorChange = (value: string | undefined) => {
    setFiles(prev => prev.map(f => f.name === activeFile ? { ...f, content: value || '' } : f));
  };

  const runCode = () => {
    const html = files.find(f => f.name.endsWith('.html'))?.content || '';
    const css = files.find(f => f.name.endsWith('.css'))?.content || '';
    const js = files.find(f => f.name.endsWith('.js'))?.content || '';

    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (err) {
              console.error(err);
            }
          </script>
        </body>
      </html>
    `;
    setPreviewDoc(combined);
    if (isMobile) setActiveTab('preview');
  };

  const exportZip = async () => {
    const zip = new JSZip();
    files.forEach(f => zip.file(f.name, f.content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetProject = () => {
    if (confirm('Are you sure you want to reset to default files? All changes will be lost.')) {
      setFiles(DEFAULT_FILES);
      setActiveFile('index.html');
      setPreviewDoc('');
    }
  };

  const currentFile = files.find(f => f.name === activeFile);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col pt-16">
      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-indigo-400 font-bold">
            <Code2 size={20} className="mr-2" />
            <span>Fast IDE</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={resetProject} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Reset Project">
            <RefreshCw size={18} />
          </button>
          <button onClick={exportZip} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Export ZIP">
            <Download size={18} />
          </button>
          <button onClick={runCode} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
            <Play size={16} className="mr-2" />
            Run Code
          </button>
          <Link to="/" className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-2" title="Close IDE">
            <X size={20} />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {isMobile ? (
          <div className="flex-1 flex flex-col w-full h-full">
            <div className="flex bg-slate-900 border-b border-slate-800 p-2 gap-2">
              <button onClick={() => setActiveTab('editor')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Editor</button>
              <button onClick={() => setActiveTab('preview')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Preview</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'editor' && (
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex bg-slate-900 overflow-x-auto border-b border-slate-800">
                    {files.map(f => (
                      <button key={f.name} onClick={() => setActiveFile(f.name)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeFile === f.name ? 'border-indigo-500 text-white bg-slate-800' : 'border-transparent text-slate-400 hover:bg-slate-800/50'}`}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    {currentFile && (
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        language={currentFile.language}
                        value={currentFile.content}
                        onChange={handleEditorChange}
                        options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 } }}
                      />
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'preview' && (
                <div className="absolute inset-0 bg-white">
                  <iframe srcDoc={previewDoc} className="w-full h-full border-none" sandbox="allow-scripts allow-modals" title="Preview" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <PanelGroup direction="horizontal">
            {/* Sidebar Files */}
            <Panel defaultSize={15} minSize={10} className="bg-slate-900 border-r border-slate-800 flex flex-col">
              <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Files</div>
              <div className="flex-1 overflow-y-auto py-2">
                {files.map(f => (
                  <button
                    key={f.name}
                    onClick={() => setActiveFile(f.name)}
                    className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${activeFile === f.name ? 'bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <FileCode size={16} className="mr-3 opacity-70" />
                    {f.name}
                  </button>
                ))}
              </div>
            </Panel>
            
            <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-indigo-500 transition-colors cursor-col-resize" />

            {/* Editor */}
            <Panel defaultSize={45} minSize={20} className="flex flex-col bg-[#1e1e1e]">
              <div className="flex bg-slate-900 border-b border-slate-800">
                {files.map(f => (
                  <button key={f.name} onClick={() => setActiveFile(f.name)} className={`px-4 py-2 text-sm font-medium border-t-2 ${activeFile === f.name ? 'border-indigo-500 text-white bg-[#1e1e1e]' : 'border-transparent text-slate-400 hover:bg-slate-800'}`}>
                    {f.name}
                  </button>
                ))}
              </div>
              <div className="flex-1 relative">
                {currentFile && (
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={currentFile.language}
                    value={currentFile.content}
                    onChange={handleEditorChange}
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 }, scrollBeyondLastLine: false }}
                  />
                )}
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-indigo-500 transition-colors cursor-col-resize" />

            {/* Preview */}
            <Panel defaultSize={40} minSize={20} className="bg-white flex flex-col relative">
              {!previewDoc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                  <Play size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">Click "Run Code" to see preview</p>
                </div>
              )}
              <iframe srcDoc={previewDoc} className="w-full h-full border-none" sandbox="allow-scripts allow-modals" title="Preview" />
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}
