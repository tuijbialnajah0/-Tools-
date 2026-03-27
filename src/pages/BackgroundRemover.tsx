import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  AlertCircle,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { getGenAI, getAllKeysCount } from "../services/geminiService";

export function BackgroundRemover() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Processing...");
  const [viewMode, setViewMode] = useState<"side-by-side" | "slider" | "single">("single");
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setOriginalFile(file);
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
    if (!originalImage || !originalFile) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressText("Connecting to AI Service...");
    
    // Give UI a chance to show the loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      let ai = getGenAI();
      const totalKeys = getAllKeysCount();
      let keyAttempts = 0;
      
      // Extract base64 data and mime type
      const base64Data = originalImage.split(',')[1];
      const mimeType = originalImage.split(';')[0].split(':')[1];

      setProgress(30);
      setProgressText("AI is analyzing image...");

      let foundImage = false;
      let lastError: any = null;

      // Try free image models in sequence
      const modelsToTry = [
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image-preview',
        'gemini-3-pro-image'
      ];

      for (const currentModel of modelsToTry) {
        // Reset key attempts for each model
        keyAttempts = 0;
        
        while (keyAttempts < totalKeys) {
          try {
            setProgressText(`Processing with AI (${currentModel})...`);
            const response = await ai.models.generateContent({
              model: currentModel,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType,
                    },
                  },
                  {
                    text: 'Remove the background from this image. Return ONLY the subject with a fully transparent background. Do not include any white or solid color background. The output MUST be a transparent PNG image part.',
                  },
                ],
              },
            });

            if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  const resultBase64 = part.inlineData.data;
                  const resMimeType = part.inlineData.mimeType || 'image/png';
                  setProcessedImage(`data:${resMimeType};base64,${resultBase64}`);
                  foundImage = true;
                  break;
                } else if (part.fileData) {
                  setProcessedImage(part.fileData.fileUri);
                  foundImage = true;
                  break;
                }
              }
            }

            if (foundImage) break;
            
            if (response.candidates && response.candidates[0] && response.candidates[0].finishReason === 'SAFETY') {
              lastError = new Error(`Model ${currentModel} blocked the image due to safety filters.`);
              break; // Don't retry same model with different key if it's a safety block
            } else {
              lastError = new Error(`AI model ${currentModel} did not return an image part.`);
              break; // Try next model
            }
          } catch (err: any) {
            console.warn(`Model ${currentModel} failed with key attempt ${keyAttempts + 1}:`, err);
            lastError = err;
            
            const errMsg = err.message || "";
            const is403 = errMsg.includes('403') || errMsg.toLowerCase().includes('permission');
            const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');

            if ((is403 || isQuotaError) && keyAttempts < totalKeys - 1) {
              console.log(`Rotating to next API key due to ${is403 ? 'permission' : 'quota'} error...`);
              ai = getGenAI();
              keyAttempts++;
              continue; // Retry same model
            }

            break; // Try next model
          }
        }

        if (foundImage) break;
      }

      if (!foundImage) {
        const errMsg = lastError?.message || "";
        const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');
        const isPermissionError = errMsg.includes('403') || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('permission_denied');

        if (isQuotaError) {
          setError("Quota exceeded for all available free models. Please select your own API key.");
          return;
        }
        if (isPermissionError) {
          setError("Permission denied for all available API keys. Please check your key configuration.");
          return;
        }
        throw lastError || new Error('All models failed to process the image. Please try again with a different image.');
      }

      setProgress(100);
      setProgressText("Complete!");
    } catch (err: any) {
      console.error("Gemini Background removal error:", err);
      setError(err.message || "Failed to process image with AI. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    
    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "background-removed.png";
    link.click();
  };

  const reset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 glass rounded-2xl shadow-sm">
            <ImageIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
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
              className="glass rounded-2xl border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 p-8 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
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
            !processedImage ? (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 space-y-6"
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

                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mb-1">
                      Powered by 𝙱𝙹𝙴 ~ Clan
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Uses professional-grade AI for instant and precise background removal.
                    </p>
                  </div>

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
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 space-y-6"
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

                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                      Ready for Download
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      The background has been removed. You can now download the transparent PNG.
                    </p>
                  </div>

                  <button 
                    onClick={handleDownload}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Result
                  </button>
                </div>
              </motion.div>
            )
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex flex-col gap-3"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              {error.includes('Quota exceeded') && (
                <button
                  onClick={handleSelectKey}
                  className="w-full py-2 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs"
                >
                  Select API Key (Paid)
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview Area */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-3xl p-4 md:p-8 min-h-[500px] flex flex-col">
            
            {/* Toolbar */}
            {processedImage && (
              <div className="flex items-center justify-center mb-8">
                <div className="glass p-1 rounded-xl flex flex-wrap justify-center gap-1">
                  {[
                    { id: "single", label: "Single", icon: ImageIcon },
                    { id: "side-by-side", label: "Side by Side", icon: Layers },
                    { id: "slider", label: "Slider", icon: Maximize2 },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id as any)}
                      className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                        viewMode === mode.id 
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      <mode.icon className="w-4 h-4 mr-2" />
                      <span className="hidden xs:inline">{mode.label}</span>
                      <span className="xs:hidden">{mode.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Canvas */}
            <div className="flex-1 relative rounded-2xl overflow-hidden glass border border-slate-100/30 dark:border-slate-800/30 flex items-center justify-center">
              {!originalImage ? (
                <div className="text-center p-12">
                  <div className="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No image uploaded yet</p>
                </div>
              ) : (
                <div className="w-full h-full relative flex items-center justify-center p-4">
                  
                  {/* Single View */}
                  {viewMode === "single" && (
                    <div className="relative max-w-full max-h-full group flex items-center justify-center">
                      {/* Background Layer (Checkerboard) */}
                      {processedImage && (
                        <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
                        </div>
                      )}

                      {/* Image Layer */}
                      <img 
                        src={processedImage || originalImage} 
                        alt="Preview" 
                        className={`relative max-w-full max-h-[600px] rounded-lg transition-all duration-500 z-10 ${
                          isProcessing ? "blur-sm opacity-50" : ""
                        }`}
                        style={{ 
                          filter: !isProcessing && processedImage ? "drop-shadow(0 20px 30px rgba(0,0,0,0.15))" : "none" 
                        }}
                        referrerPolicy="no-referrer"
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
                        <span className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-md z-10">Original</span>
                        <img src={originalImage} alt="Original" className="max-w-full max-h-full rounded-lg shadow-xl object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="relative flex flex-col items-center justify-center">
                        <span className="absolute top-4 left-4 bg-indigo-600/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-md z-10">Processed</span>
                        <div className="relative w-full h-full flex items-center justify-center">
                          <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
                          </div>
                          <img 
                            src={processedImage} 
                            alt="Processed" 
                            className="max-w-full max-h-full rounded-lg object-contain z-10" 
                            style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.1))" }}
                            referrerPolicy="no-referrer"
                          />
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
                          <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
                          </div>
                          <img 
                            src={processedImage} 
                            alt="Processed" 
                            className="max-w-full max-h-[600px] rounded-lg z-10 relative" 
                            style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.1))" }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        {/* Original Image (Top, Clipped) */}
                        <div 
                          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-20"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img 
                            src={originalImage} 
                            alt="Original" 
                            className="max-w-none h-full object-cover" 
                            style={{ width: containerRef.current?.offsetWidth }} 
                            referrerPolicy="no-referrer"
                          />
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
                <Sparkles className="w-4 h-4 text-emerald-500 mr-2" />
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
