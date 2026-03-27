import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { FileCode, Eye, Upload, X, Maximize2, Minimize2, Code, Palette, Terminal } from "lucide-react";

export function HtmlViewer() {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [customCss, setCustomCss] = useState<string>("");
  const [customJs, setCustomJs] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInjections, setShowInjections] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/html") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setHtmlContent(content);
        setFileName(file.name);
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a valid HTML file.");
    }
  };

  const clearFile = () => {
    setHtmlContent(null);
    setFileName(null);
    setCustomCss("");
    setCustomJs("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getInjectedHtml = () => {
    if (!htmlContent) return "";
    
    let injected = htmlContent;
    
    // Inject CSS before </head> or at the end of content
    if (customCss.trim()) {
      const styleTag = `\n<style>\n${customCss}\n</style>\n`;
      if (injected.includes("</head>")) {
        injected = injected.replace("</head>", `${styleTag}</head>`);
      } else {
        injected = `${styleTag}${injected}`;
      }
    }
    
    // Inject JS before </body> or at the end of content
    if (customJs.trim()) {
      const scriptTag = `\n<script>\n${customJs}\n</script>\n`;
      if (injected.includes("</body>")) {
        injected = injected.replace("</body>", `${scriptTag}</body>`);
      } else {
        injected = `${injected}${scriptTag}`;
      }
    }
    
    return injected;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4">
          <FileCode className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">HTML Viewer</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Upload any HTML file to preview it instantly in a secure sandbox environment.
        </p>
      </div>

      {/* Upload Section */}
      {!htmlContent ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] p-12 text-center hover:border-indigo-500 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".html"
              className="hidden"
            />
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Click to upload HTML</h3>
            <p className="text-slate-500 dark:text-slate-400">Drag and drop your .html file here</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4' : ''}`}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <span className="font-bold truncate max-w-[200px]">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInjections(!showInjections)}
                className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold ${showInjections ? 'bg-indigo-500 text-white' : 'hover:bg-white/10 text-slate-400'}`}
                title="Inject CSS/JS"
              >
                <Code className="w-5 h-5" />
                <span className="hidden sm:inline">Inject</span>
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={clearFile}
                className="p-2 hover:bg-red-500 rounded-xl transition-colors"
                title="Close Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`grid gap-4 ${showInjections && !isFullscreen ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Injection Panel */}
            {showInjections && !isFullscreen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1 space-y-4"
              >
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Palette className="w-5 h-5" />
                    <h3 className="font-bold">Custom CSS</h3>
                  </div>
                  <textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder="/* Add your CSS here */\nbody { background: #f0f; }"
                    className="w-full h-40 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />

                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2 pt-4">
                    <Terminal className="w-5 h-5" />
                    <h3 className="font-bold">Custom JS</h3>
                  </div>
                  <textarea
                    value={customJs}
                    onChange={(e) => setCustomJs(e.target.value)}
                    placeholder="// Add your JS here\nalert('Hello from injected JS!');"
                    className="w-full h-40 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                  
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold text-center pt-2">
                    Changes apply in real-time
                  </p>
                </div>
              </motion.div>
            )}

            {/* Preview Frame */}
            <div className={`bg-white rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl ${showInjections && !isFullscreen ? 'lg:col-span-2' : ''} ${isFullscreen ? 'h-[calc(100vh-100px)]' : 'h-[600px]'}`}>
              <iframe
                ref={iframeRef}
                srcDoc={getInjectedHtml()}
                title="HTML Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-modals allow-forms"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
