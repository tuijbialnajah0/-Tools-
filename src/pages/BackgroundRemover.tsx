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
import { Link } from "react-router-dom";
import { removeBackground } from "@imgly/background-removal";
import { GoogleGenAI } from "@google/genai";

export function BackgroundRemover() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Processing...");
  const [viewMode, setViewMode] = useState<"side-by-side" | "slider" | "single">("single");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [bgType, setBgType] = useState<"transparent" | "color" | "gradient" | "blur">("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgGradient, setBgGradient] = useState("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
  const [blurAmount, setBlurAmount] = useState(10);
  const [engine, setEngine] = useState<"offline" | "gemini">("offline");
  const [modelSize, setModelSize] = useState<"isnet_quint8" | "isnet_fp16">("isnet_quint8");
  const [isCrossIsolated, setIsCrossIsolated] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsCrossIsolated(window.crossOriginIsolated);
  }, []);

  // Removed simulated progress to use actual progress from the library
  useEffect(() => {
    if (processedImage) {
      setProgress(100);
      setProgressText("Complete!");
    }
  }, [processedImage]);

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

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    if (engine === "offline") {
      setProgressText("Initializing offline model...");
      try {
        // Use local @imgly/background-removal (Offline capable after first download)
        const resultBlob = await removeBackground(originalImage, {
          model: modelSize,
          progress: (key, current, total) => {
            if (!total || total === 0) {
              setProgressText(`Initializing ${key}...`);
              return;
            }
            const percent = Math.round((current / total) * 100);
            if (key.includes("fetch")) {
              setProgressText(`Downloading AI Model (${modelSize}): ${percent}%`);
            } else if (key.includes("compute")) {
              setProgressText(`AI Inference: ${percent}%`);
            } else {
              setProgressText(`Processing Image: ${percent}%`);
            }
            setProgress(percent);
          }
        });
        const resultUrl = URL.createObjectURL(resultBlob);
        setProcessedImage(resultUrl);
      } catch (err: any) {
        console.error("Background removal error:", err);
        let msg = err.message || "Failed to process image.";
        if (msg.includes("SharedArrayBuffer")) {
          msg = "Multi-threading error. Please try refreshing the page or using Gemini Cloud.";
        }
        setError(msg);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setProgressText("Connecting to Gemini AI...");
      setProgress(30);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Extract base64 data and mime type
        const base64Data = originalImage.split(',')[1];
        const mimeType = originalImage.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: 'Remove the background from this image. Return only the image with a transparent background as an image part.',
              },
            ],
          },
        });

        let foundImage = false;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const resultBase64 = part.inlineData.data;
            setProcessedImage(`data:image/png;base64,${resultBase64}`);
            foundImage = true;
            break;
          }
        }

        if (!foundImage) {
          throw new Error('AI did not return a processed image. Please try again.');
        }
        setProgress(100);
        setProgressText("Complete!");
      } catch (err: any) {
        console.error("Gemini Background removal error:", err);
        setError(err.message || "Failed to process image with Gemini AI. Please try again.");
      } finally {
        setIsProcessing(false);
      }
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

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-indigo-500" />
                  Model Size (Offline Only)
                </label>
                {!isCrossIsolated && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-700 dark:text-amber-400">
                      Browser isolation disabled. Processing might be slower or stuck.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModelSize("isnet_quint8")}
                    disabled={engine !== "offline"}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      modelSize === "isnet_quint8" 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                        : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    } ${engine !== "offline" ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-[10px] font-bold uppercase">Small</span>
                    <span className="text-[8px] opacity-60">~40MB</span>
                  </button>
                  <button
                    onClick={() => setModelSize("isnet_fp16")}
                    disabled={engine !== "offline"}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      modelSize === "isnet_fp16" 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                        : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    } ${engine !== "offline" ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-[10px] font-bold uppercase">Medium</span>
                    <span className="text-[8px] opacity-60">~80MB</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                  AI Engine
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEngine("offline")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      engine === "offline" 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                        : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Offline</span>
                  </button>
                  <button
                    onClick={() => setEngine("gemini")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      engine === "gemini" 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                        : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Gemini Cloud</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                  {engine === "offline" 
                    ? "Uses your device's power. No data sent to cloud." 
                    : "Uses Google's powerful AI. Faster for complex images."}
                </p>
              </div>

              {!processedImage ? (
                <div className="space-y-4">
                  <button 
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {progressText}
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
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{progressText}</span>
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
