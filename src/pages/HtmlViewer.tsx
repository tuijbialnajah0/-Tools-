import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, FileCode, Download, Upload, Trash2, ChevronLeft, Monitor, Smartphone, Maximize2, Minimize2, MoreVertical, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Viewer Preview</title>
    <style>
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            color: white;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 2rem;
            border-radius: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 100%;
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.1rem; opacity: 0.9; }
        @media (max-width: 640px) {
            h1 { font-size: 1.8rem; }
            p { font-size: 1rem; }
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello World!</h1>
        <p>This is a live preview of your HTML code.</p>
        <p>Edit the code on the left to see changes here.</p>
    </div>
</body>
</html>`;

export function HtmlViewer() {
  const [code, setCode] = useState(DEFAULT_HTML);
  const [previewDoc, setPreviewDoc] = useState(DEFAULT_HTML);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live preview with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewDoc(code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const updatePreview = () => {
    setPreviewDoc(code);
    setShowMobileMenu(false);
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Update state
        setCode(content);
        setPreviewDoc(content);
        
        // Force update editor if ref exists
        if (editorRef.current) {
          editorRef.current.setValue(content);
        }
        
        // If on mobile, switch to preview to show it worked
        if (isMobile) setActiveTab('preview');
      }
    };
    reader.onerror = () => {
      alert("Failed to read file");
    };
    reader.readAsText(file);
    // Reset input value to allow uploading the same file again
    e.target.value = '';
  };

  const downloadHtml = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCode = () => {
    setCode('');
    setPreviewDoc('');
    setShowMobileMenu(false);
  };

  return (
    <div className={`fixed inset-0 z-[60] bg-slate-950 flex flex-col pt-16 ${isFullscreen ? 'pt-0' : ''}`}>
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0">
        <div className="flex items-center space-x-2 md:space-x-4">
          {!isFullscreen && (
            <Link to="/" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <ChevronLeft size={20} />
            </Link>
          )}
          <div className="flex items-center text-indigo-400 font-bold text-base md:text-lg">
            <FileCode size={20} className="md:size-6 mr-2 md:mr-3" />
            <span className="hidden xs:inline">HTML Viewer</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          {/* Desktop View Controls */}
          <div className="hidden lg:flex items-center bg-slate-800 rounded-xl p-1 mr-2">
            <button 
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Desktop View"
            >
              <Monitor size={18} />
            </button>
            <button 
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Mobile View"
            >
              <Smartphone size={18} />
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".html,.htm,.txt" 
            className="hidden" 
          />
          
          {/* Action Buttons - Hidden on small mobile, shown in menu */}
          <div className="hidden sm:flex items-center space-x-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              title="Upload HTML File"
            >
              <Upload size={20} />
            </button>
            
            <button 
              onClick={downloadHtml}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              title="Download HTML"
            >
              <Download size={20} />
            </button>

            <button 
              onClick={clearCode}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-900/20 rounded-xl transition-all"
              title="Clear Code"
            >
              <Trash2 size={20} />
            </button>

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="sm:hidden relative">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              {showMobileMenu ? <X size={20} /> : <MoreVertical size={20} />}
            </button>

            {showMobileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 overflow-hidden">
                <button 
                  onClick={() => { fileInputRef.current?.click(); setShowMobileMenu(false); }}
                  className="w-full flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Upload size={18} className="mr-3" /> Upload File
                </button>
                <button 
                  onClick={() => { downloadHtml(); setShowMobileMenu(false); }}
                  className="w-full flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Download size={18} className="mr-3" /> Download
                </button>
                <button 
                  onClick={clearCode}
                  className="w-full flex items-center px-4 py-3 text-rose-400 hover:bg-rose-900/20 transition-colors"
                >
                  <Trash2 size={18} className="mr-3" /> Clear Code
                </button>
                <button 
                  onClick={() => { setIsFullscreen(!isFullscreen); setShowMobileMenu(false); }}
                  className="w-full flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize2 size={18} className="mr-3" /> : <Maximize2 size={18} className="mr-3" />}
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={updatePreview}
            className="flex items-center px-4 md:px-6 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 ml-2"
          >
            <Play size={18} className="md:mr-2" />
            <span className="hidden md:inline">Run</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isMobile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 relative ${activeTab === 'code' ? 'block' : 'hidden'}`}>
              {!isEditorReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <Editor
                height="100%"
                theme="vs-dark"
                defaultLanguage="html"
                value={code}
                onMount={handleEditorDidMount}
                onChange={(v) => setCode(v || '')}
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 14, 
                  wordWrap: 'on', 
                  padding: { top: 10 },
                  scrollBeyondLastLine: false,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 3,
                  automaticLayout: true
                }}
              />
            </div>
            <div className={`flex-1 bg-white relative ${activeTab === 'preview' ? 'block' : 'hidden'}`}>
              <iframe 
                srcDoc={previewDoc} 
                className="w-full h-full border-none" 
                sandbox="allow-scripts allow-modals" 
                title="Preview" 
              />
            </div>

            {/* Mobile Bottom Toggle */}
            <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center shrink-0">
              <button 
                onClick={() => setActiveTab('code')}
                className={`flex-1 h-full flex flex-col items-center justify-center transition-all ${activeTab === 'code' ? 'text-indigo-400 bg-slate-800/50' : 'text-slate-500'}`}
              >
                <FileCode size={20} />
                <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">Code</span>
              </button>
              <div className="w-px h-8 bg-slate-800" />
              <button 
                onClick={() => { updatePreview(); setActiveTab('preview'); }}
                className={`flex-1 h-full flex flex-col items-center justify-center transition-all ${activeTab === 'preview' ? 'text-indigo-400 bg-slate-800/50' : 'text-slate-500'}`}
              >
                <Play size={20} />
                <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">Preview</span>
              </button>
            </div>
          </div>
        ) : (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={50} minSize={20} className="bg-[#1e1e1e] relative">
              {!isEditorReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <Editor
                height="100%"
                theme="vs-dark"
                defaultLanguage="html"
                value={code}
                onMount={handleEditorDidMount}
                onChange={(v) => setCode(v || '')}
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 15, 
                  wordWrap: 'on', 
                  padding: { top: 20 },
                  scrollBeyondLastLine: false,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.6,
                  automaticLayout: true
                }}
              />
            </Panel>
            
            <PanelResizeHandle className="w-1.5 bg-slate-900 hover:bg-indigo-600 transition-all cursor-col-resize" />

            <Panel defaultSize={50} minSize={20} className="bg-slate-100 flex items-center justify-center overflow-hidden">
              <div 
                className={`bg-white shadow-2xl transition-all duration-500 overflow-hidden ${
                  viewMode === 'mobile' ? 'w-[375px] h-[667px] rounded-[3rem] border-[12px] border-slate-900' : 'w-full h-full'
                }`}
              >
                {!previewDoc && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Play size={64} className="mb-6 opacity-10" />
                    <p className="text-lg font-medium">Click "Run" to see preview</p>
                  </div>
                )}
                <iframe 
                  srcDoc={previewDoc} 
                  className="w-full h-full border-none" 
                  sandbox="allow-scripts allow-modals" 
                  title="Preview" 
                />
              </div>
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}
