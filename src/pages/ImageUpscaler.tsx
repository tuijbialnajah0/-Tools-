import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  History,
  Trash2,
  ExternalLink,
  Sparkles,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EnhancedImage {
  id: string;
  originalUrl: string;
  enhancedUrl: string;
  timestamp: number;
  status: 'success' | 'error';
}

export default function ImageUpscaler() {
  const [imageUrl, setImageUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EnhancedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EnhancedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("upscaler-history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("upscaler-history", JSON.stringify(history));
  }, [history]);

  const handleEnhance = async (urlToEnhance: string) => {
    if (!urlToEnhance) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = `https://image-enhance.apis-bj-devs.workers.dev/?imageurl=${encodeURIComponent(urlToEnhance)}`;
      
      // Using the internal proxy to avoid CORS issues
      const response = await fetch('/api/proxy-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: apiUrl,
          method: 'GET'
        })
      });

      if (!response.ok) {
        throw new Error("Failed to connect to enhancement service");
      }

      const proxyData = await response.json();
      
      if (proxyData.status !== 200) {
        throw new Error(proxyData.data?.error || "API returned an error");
      }

      const data = typeof proxyData.data === 'string' ? JSON.parse(proxyData.data) : proxyData.data;

      if (data.status === "success" && data.download_url) {
        const newResult: EnhancedImage = {
          id: Math.random().toString(36).substr(2, 9),
          originalUrl: urlToEnhance,
          enhancedUrl: data.download_url,
          timestamp: Date.now(),
          status: 'success'
        };
        setResult(newResult);
        setHistory(prev => [newResult, ...prev.slice(0, 19)]); // Keep last 20
      } else {
        throw new Error(data.message || "Enhancement failed. Please try a different image.");
      }
    } catch (err: any) {
      console.error("Enhancement error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Since the API requires a URL, we'd ideally upload this file somewhere.
      // For now, we'll inform the user or try to use a data URL if the API supports it (unlikely).
      // Most workers APIs like this expect a public URL.
      setError("Local file upload is currently limited. Please provide a public image URL for best results.");
      
      // We could potentially use a temporary hosting service here if needed.
      // For this demo, we'll focus on the URL input as requested by the API structure.
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Handle drop logic if needed
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your history?")) {
      setHistory([]);
    }
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 mb-4"
          >
            <Sparkles className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            AI Image <span className="text-indigo-600">Upscaler</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Enhance, upscale, and restore your images using advanced AI. 
            Simply paste a URL and let the magic happen.
          </p>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider ml-1">
                    Image URL
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Paste image URL here..."
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      <button 
                        onClick={() => handleEnhance(imageUrl)}
                        disabled={isProcessing || !imageUrl}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Enhance
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-bold tracking-widest">OR</span>
                  </div>
                </div>

                <div 
                  className={`relative border-2 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer group ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10" 
                      : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*"
                  />
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">Click to upload image</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG or WEBP (Max 5MB)</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Section */}
            <AnimatePresence>
              {result && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">Enhancement Complete</h2>
                    </div>
                    <a 
                      href={result.enhancedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Original</p>
                      <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                        <img 
                          src={result.originalUrl} 
                          alt="Original" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        Enhanced <Sparkles className="w-3 h-3" />
                      </p>
                      <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500/30 relative group">
                        <img 
                          src={result.enhancedUrl} 
                          alt="Enhanced" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button 
                             onClick={() => window.open(result.enhancedUrl, '_blank')}
                             className="p-4 bg-white rounded-full text-indigo-600 transform scale-90 group-hover:scale-100 transition-transform"
                           >
                             <Maximize2 className="w-6 h-6" />
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <a 
                      href={result.enhancedUrl}
                      download={`enhanced-${Date.now()}.jpg`}
                      className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-500/40 active:scale-95"
                    >
                      <Download className="w-6 h-6" />
                      Download Enhanced Image
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider">Recent</h3>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {history.length > 0 ? (
                  history.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group relative bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                          <img 
                            src={item.enhancedUrl} 
                            alt="History item" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <p className="text-xs text-slate-400 font-bold mb-1">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setResult(item)}
                              className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              View
                            </button>
                            <a 
                              href={item.enhancedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              Open
                            </a>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">No recent history</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
