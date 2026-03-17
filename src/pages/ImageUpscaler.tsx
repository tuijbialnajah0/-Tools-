import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Maximize2,
  Sparkles,
  ArrowRight,
  Zap
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { executeTool } from "../lib/toolService";

export function ImageUpscaler() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scale, setScale] = useState<2 | 4 | 8>(2);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [originalRes, setOriginalRes] = useState<{ w: number; h: number } | null>(null);
  const [toolId, setToolId] = useState<string | null>(null);
  const [creditCost, setCreditCost] = useState<number>(10);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchToolData = async () => {
      try {
        const toolsRef = collection(db, "tools");
        const q = query(toolsRef, where("tool_name", "==", "Image Upscaler"), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setToolId(doc.id);
          if (doc.data().credit_cost !== undefined) {
            setCreditCost(doc.data().credit_cost);
          }
        } else {
          console.log("Tool 'Image Upscaler' not found in database.");
        }
      } catch (err) {
        console.error("Error fetching tool data:", err);
      }
    };
    fetchToolData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size too large. Please upload an image smaller than 10MB.");
      return;
    }

    setError(null);
    setUpscaledImage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalImage(dataUrl);
      
      // Get resolution
      const img = new Image();
      img.onload = () => {
        setOriginalRes({ w: img.width, h: img.height });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUpscale = async () => {
    if (!originalImage) return;

    const isAdmin = user?.role === "admin";
    if (!isAdmin && user && user.credit_balance < creditCost) {
      setError("Insufficient credits to upscale this image.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(10);

    try {
      const img = new Image();
      img.src = originalImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      setProgress(30);

      // Step-up scaling for better quality than a single massive jump
      let currentCanvas = document.createElement('canvas');
      currentCanvas.width = img.width;
      currentCanvas.height = img.height;
      let currentCtx = currentCanvas.getContext('2d');
      if (!currentCtx) throw new Error("Canvas not supported.");
      currentCtx.drawImage(img, 0, 0);

      let currentScale = 1;
      while (currentScale < scale) {
        let nextScale = Math.min(currentScale * 2, scale);
        let ratio = nextScale / currentScale;
        
        let nextCanvas = document.createElement('canvas');
        nextCanvas.width = currentCanvas.width * ratio;
        nextCanvas.height = currentCanvas.height * ratio;
        let nextCtx = nextCanvas.getContext('2d');
        if (!nextCtx) throw new Error("Canvas not supported.");
        
        nextCtx.imageSmoothingEnabled = true;
        nextCtx.imageSmoothingQuality = 'high';
        
        // Add a very slight contrast/saturation boost on the final step to simulate "enhancement"
        if (nextScale === scale) {
             nextCtx.filter = 'contrast(1.02) saturate(1.05)';
        }
        
        nextCtx.drawImage(currentCanvas, 0, 0, nextCanvas.width, nextCanvas.height);
        
        currentCanvas = nextCanvas;
        currentScale = nextScale;
        setProgress(30 + (currentScale / scale) * 50);
      }

      const upscaledDataUrl = currentCanvas.toDataURL('image/png', 1.0);

      // Deduct credits after successful processing
      if (toolId && user) {
        await executeTool(user.id, toolId);
      }

      // Update local user state if not admin
      if (user && !isAdmin) {
        updateUser({ 
          credit_balance: user.credit_balance - creditCost,
          total_spent: (user.total_spent || 0) + creditCost
        });
      }

      setUpscaledImage(upscaledDataUrl);
      setProgress(100);
    } catch (err: any) {
      console.error("Upscaling error:", err);
      setError("Failed to perform upscaling. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!upscaledImage) return;
    const link = document.createElement("a");
    link.href = upscaledImage;
    link.download = `upscaled-${scale}x.png`;
    link.click();
  };

  const reset = () => {
    setOriginalImage(null);
    setUpscaledImage(null);
    setError(null);
    setProgress(0);
    setOriginalRes(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link 
            to="/" 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              Image Upscaler
              <Sparkles className="w-6 h-6 ml-2 text-indigo-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Enhance and upscale your images up to 8x</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Cost:</span>
          <div className="flex items-center ml-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <span className="mr-1">💳</span>
            {creditCost} Credits
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {!originalImage ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Upload Image</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Drag and drop or click to browse. Supports PNG, JPG, WEBP.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Choose File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">Upscale Settings</h3>
                <button 
                  onClick={reset}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Upscale Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 4, 8].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScale(s as any)}
                      disabled={isProcessing || !!upscaledImage}
                      className={`py-3 rounded-xl border transition-all font-bold ${
                        scale === s 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                          : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      } disabled:opacity-50`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {!upscaledImage ? (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Cost</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center">
                      <span className="mr-1">💳</span>
                      {creditCost} Credits
                    </span>
                  </div>
                  <button 
                    onClick={handleUpscale}
                    disabled={isProcessing}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Upscaling...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Upscale
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={handleDownload}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Result
                  </button>
                  <button 
                    onClick={reset}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Upscale Another
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-8 min-h-[500px] flex flex-col">
            
            {/* Resolution Badge */}
            {originalRes && (
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl flex items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Original:</span>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">{originalRes.w} x {originalRes.h}</span>
                </div>
                {upscaledImage && (
                  <>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl flex items-center border border-indigo-100 dark:border-indigo-800">
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mr-2">Enhanced:</span>
                      <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{originalRes.w * scale} x {originalRes.h * scale}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Preview Canvas */}
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
              {!originalImage ? (
                <div className="text-center p-12">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No image uploaded yet</p>
                </div>
              ) : (
                <div className="w-full h-full relative flex items-center justify-center p-4">
                  
                  {!upscaledImage ? (
                    <div className="relative max-w-full max-h-full group flex items-center justify-center">
                      <img 
                        src={originalImage} 
                        alt="Preview" 
                        className={`relative max-w-full max-h-[600px] rounded-lg shadow-2xl transition-all duration-500 ${isProcessing ? "blur-sm opacity-50" : ""}`}
                      />

                      {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl" />
                          <div className="bg-white/90 dark:bg-slate-900/90 px-4 py-2 rounded-full shadow-lg border border-indigo-100 dark:border-indigo-900">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Processing...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Slider View */
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" ref={containerRef}>
                      <div className="relative max-w-full max-h-full aspect-auto">
                        {/* Upscaled Image (Bottom) */}
                        <div className="relative">
                          <img src={upscaledImage} alt="Upscaled" className="max-w-full max-h-[600px] rounded-lg shadow-xl" />
                        </div>
                        
                        {/* Original Image (Top, Clipped) */}
                        <div 
                          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img 
                            src={originalImage} 
                            alt="Original" 
                            className="max-w-none h-full object-cover" 
                            style={{ width: containerRef.current?.offsetWidth }} 
                          />
                        </div>

                        {/* Slider Handle */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-white shadow-xl cursor-ew-resize flex items-center justify-center z-20"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center -ml-0.5 border-4 border-indigo-500">
                            <div className="flex space-x-0.5">
                              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            </div>
                          </div>
                          
                          {/* Labels */}
                          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md transform -translate-x-full mr-4">
                            Original
                          </div>
                          <div className="absolute top-4 right-4 bg-indigo-600/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md transform translate-x-full ml-4">
                            Upscaled
                          </div>
                        </div>

                        {/* Invisible Input for Slider */}
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={sliderPosition} 
                          onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 dark:text-slate-400 text-sm gap-4">
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                High-Quality Interpolation
              </div>
              <div className="flex items-center">
                <Zap className="w-4 h-4 text-indigo-500 mr-2" />
                Step-up Scaling
              </div>
              <div className="flex items-center">
                <Sparkles className="w-4 h-4 text-amber-500 mr-2" />
                Professional Quality
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
