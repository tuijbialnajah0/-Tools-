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
  Minimize2,
  Palette,
  Layers,
  Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { executeTool } from "../lib/toolService";
import { removeBackground } from "@imgly/background-removal";

export function BackgroundRemover() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"side-by-side" | "slider" | "single">("single");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [bgType, setBgType] = useState<"transparent" | "color" | "gradient" | "blur">("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgGradient, setBgGradient] = useState("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
  const [blurAmount, setBlurAmount] = useState(10);
  const [toolId, setToolId] = useState<string | null>(null);
  const [creditCost, setCreditCost] = useState<number>(10);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchToolData = async () => {
      try {
        const toolsRef = collection(db, "tools");
        const q = query(toolsRef, where("tool_name", "==", "Background Remover"), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setToolId(doc.id);
          if (doc.data().credit_cost !== undefined) {
            setCreditCost(doc.data().credit_cost);
          }
        }
      } catch (err) {
        console.error("Error fetching tool data:", err);
      }
    };
    fetchToolData();
  }, []);

  // Simulated progress for better UX since the library's progress is per-asset and jumpy
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 85) return prev + Math.floor(Math.random() * 5) + 1;
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 500);
    } else if (processedImage) {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isProcessing, processedImage]);

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
    setProcessedImage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
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

  const handleRemoveBackground = async () => {
    if (!originalImage) return;

    const isAdmin = user?.role === "admin";
    if (!isAdmin && user && user.credit_balance < creditCost) {
      setError("Insufficient credits to process this image.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Process image first
      let resultBlob: Blob;
      
      try {
        // 1. Try premium APIs via our backend
        const response = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: originalImage }),
        });

        if (!response.ok) {
          throw new Error('Premium API failed or not configured');
        }

        const data = await response.json();
        if (data.result) {
          // Convert base64 result back to blob
          const res = await fetch(data.result);
          resultBlob = await res.blob();
          console.log(`Successfully processed using ${data.source}`);
        } else {
          throw new Error('Invalid response from premium API');
        }
      } catch (apiError) {
        // 2. Fallback to local @imgly/background-removal
        console.log('Falling back to local AI model...', apiError);
        resultBlob = await removeBackground(originalImage);
      }

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

      const resultUrl = URL.createObjectURL(resultBlob);
      setProcessedImage(resultUrl);
    } catch (err: any) {
      console.error("Background removal error:", err);
      setError(err.message || "Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!processedImage || !originalImage) return;
    
    if (bgType === "transparent") {
      const link = document.createElement("a");
      link.href = processedImage;
      link.download = "background-removed.png";
      link.click();
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper to load image
    const loadImg = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const [origImg, fgImg] = await Promise.all([
        loadImg(originalImage),
        loadImg(processedImage)
      ]);

      canvas.width = origImg.width;
      canvas.height = origImg.height;

      if (bgType === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgType === "gradient") {
        // Parse gradient colors from bgGradient (e.g., "linear-gradient(135deg, #667eea 0%, #764ba2 100%)")
        const colors = bgGradient.match(/#[0-9a-fA-F]{6}/g);
        if (colors && colors.length >= 2) {
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, colors[0]);
          gradient.addColorStop(1, colors[1]);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else if (bgType === "blur") {
        // Draw original image with blur
        ctx.filter = `blur(${blurAmount * (canvas.width / 800)}px)`; // Scale blur based on image width
        // Draw slightly larger to avoid unblurred edges
        ctx.drawImage(origImg, -canvas.width * 0.05, -canvas.height * 0.05, canvas.width * 1.1, canvas.height * 1.1);
        ctx.filter = "none";
      }

      // Draw foreground
      ctx.drawImage(fgImg, 0, 0, canvas.width, canvas.height);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `background-removed-${bgType}.png`;
      link.click();
    } catch (err) {
      console.error("Error generating composite image:", err);
      setError("Failed to generate the final image.");
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    setProgress(0);
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
              Background Remover
              <Sparkles className="w-6 h-6 ml-2 text-indigo-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400">AI-powered professional background removal</p>
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Upload & Controls */}
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
                <h3 className="font-bold text-slate-900 dark:text-white">Image Options</h3>
                <button 
                  onClick={reset}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {!processedImage ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Cost</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center">
                      <span className="mr-1">💳</span>
                      {creditCost} Credits
                    </span>
                  </div>
                  <button 
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing {progress}%
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Remove Background
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Background Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "transparent", label: "Transparent", icon: Layers },
                        { id: "color", label: "Color", icon: Palette },
                        { id: "gradient", label: "Gradient", icon: Sparkles },
                        { id: "blur", label: "Blur", icon: ImageIcon },
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setBgType(type.id as any)}
                          className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                            bgType === type.id 
                              ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                              : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <type.icon className="w-4 h-4 mr-2" />
                          <span className="text-xs font-bold">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {bgType === "color" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pick Color</label>
                      <div className="flex flex-wrap gap-2">
                        {["#ffffff", "#000000", "#ff4444", "#44ff44", "#4444ff", "#ffff44"].map((color) => (
                          <button
                            key={color}
                            onClick={() => setBgColor(color)}
                            className={`w-8 h-8 rounded-full border-2 ${bgColor === color ? "border-indigo-500 scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input 
                          type="color" 
                          value={bgColor} 
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-8 h-8 rounded-full overflow-hidden cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {bgType === "gradient" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pick Gradient</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
                          "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
                          "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
                          "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
                          "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
                        ].map((grad) => (
                          <button
                            key={grad}
                            onClick={() => setBgGradient(grad)}
                            className={`h-8 rounded-lg border-2 transition-all ${bgGradient === grad ? "border-indigo-500 scale-105" : "border-transparent"}`}
                            style={{ backgroundImage: grad }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {bgType === "blur" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blur Intensity</label>
                        <span className="text-xs font-bold text-indigo-600">{blurAmount}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="50" 
                        value={blurAmount} 
                        onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleDownload}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Result
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
            
            {/* Toolbar */}
            {processedImage && (
              <div className="flex items-center justify-center space-x-4 mb-8">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                  {[
                    { id: "single", label: "Single", icon: ImageIcon },
                    { id: "side-by-side", label: "Side by Side", icon: Layers },
                    { id: "slider", label: "Slider", icon: Maximize2 },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id as any)}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        viewMode === mode.id 
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      <mode.icon className="w-4 h-4 mr-2" />
                      {mode.label}
                    </button>
                  ))}
                </div>
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
                  
                  {/* Single View */}
                  {viewMode === "single" && (
                    <div className="relative max-w-full max-h-full group flex items-center justify-center">
                      {/* Background Layer */}
                      {processedImage && (
                        <div 
                          className="absolute inset-0 rounded-lg overflow-hidden"
                          style={{
                            backgroundColor: bgType === "color" ? bgColor : "transparent",
                            backgroundImage: bgType === "gradient" ? bgGradient : "none",
                            zIndex: 0
                          }}
                        >
                          {bgType === "blur" && (
                            <img 
                              src={originalImage} 
                              alt="Blurred Background" 
                              className="w-full h-full object-cover"
                              style={{ filter: `blur(${blurAmount}px)`, transform: "scale(1.1)" }}
                            />
                          )}
                          {bgType === "transparent" && (
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
                          )}
                        </div>
                      )}

                      {/* Image Layer */}
                      <img 
                        src={processedImage || originalImage} 
                        alt="Preview" 
                        className={`relative max-w-full max-h-[600px] rounded-lg shadow-2xl transition-all duration-500 z-10 ${isProcessing ? "blur-sm opacity-50" : ""}`}
                      />

                      {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl" />
                          <div className="bg-white/90 dark:bg-slate-900/90 px-4 py-2 rounded-full shadow-lg border border-indigo-100 dark:border-indigo-900">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{progress}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Side by Side View */}
                  {viewMode === "side-by-side" && processedImage && (
                    <div className="grid grid-cols-2 gap-4 w-full h-full">
                      <div className="relative flex flex-col items-center justify-center">
                        <span className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10">Original</span>
                        <img src={originalImage} alt="Original" className="max-w-full max-h-full rounded-lg shadow-xl object-contain" />
                      </div>
                      <div className="relative flex flex-col items-center justify-center">
                        <span className="absolute top-4 left-4 bg-indigo-600/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10">Processed</span>
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img src={processedImage} alt="Processed" className="max-w-full max-h-full rounded-lg shadow-xl object-contain z-10" />
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-10 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Slider View */}
                  {viewMode === "slider" && processedImage && (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" ref={containerRef}>
                      <div className="relative max-w-full max-h-full aspect-auto">
                        {/* Processed Image (Bottom) */}
                        <div className="relative">
                          <img src={processedImage} alt="Processed" className="max-w-full max-h-[600px] rounded-lg shadow-xl" />
                          <div className="absolute inset-0 -z-10 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
                        </div>
                        
                        {/* Original Image (Top, Clipped) */}
                        <div 
                          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img src={originalImage} alt="Original" className="max-w-none h-full object-cover" style={{ width: containerRef.current?.offsetWidth }} />
                        </div>

                        {/* Slider Handle */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-white shadow-xl cursor-ew-resize flex items-center justify-center z-20"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="w-8 h-8 bg-white rounded-full shadow-2xl flex items-center justify-center -ml-0.5">
                            <Maximize2 className="w-4 h-4 text-indigo-600 rotate-45" />
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
                AI-powered subject detection
              </div>
              <div className="flex items-center">
                <ImageIcon className="w-4 h-4 text-indigo-500 mr-2" />
                Transparent PNG output
              </div>
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
                Max resolution: 2048px
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
