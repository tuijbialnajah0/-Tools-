import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Palette,
  Sliders,
  Wand2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const PRESETS = {
  vintage: { name: "Vintage Color", stops: [[0,0,0], [160,110,60], [255,240,220]] },
  warmSkin: { name: "Warm Skin Tone", stops: [[40,10,10], [200,120,90], [255,230,210]] },
  nature: { name: "Nature Green", stops: [[10,30,10], [80,160,60], [220,255,200]] },
  cinematic: { name: "Cinematic Color", stops: [[10,20,40], [200,140,80], [240,250,255]] },
  classic: { name: "Classic Photo Tint", stops: [[20,20,30], [140,130,120], [255,250,245]] }
};

type PresetKey = keyof typeof PRESETS;

export function ImageColorizer() {
  const { user, updateUser } = useAuth();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [coloredImage, setColoredImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [hasPaid, setHasPaid] = useState(false);
  const [toolId, setToolId] = useState<number | null>(null);
  const [creditCost, setCreditCost] = useState(15);
  
  // Controls
  const [preset, setPreset] = useState<PresetKey>("vintage");
  const [strength, setStrength] = useState(0.8);
  const [saturation, setSaturation] = useState(1.2);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchToolId = async () => {
      const { data } = await supabase
        .from("tools")
        .select("id, credit_cost")
        .ilike("tool_name", "%Image%Colorizer%")
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setToolId(data.id);
        setCreditCost(data.credit_cost);
      }
    };
    fetchToolId();
  }, []);

  // Auto-apply changes if user has already paid for this image session
  useEffect(() => {
    if (hasPaid && originalImage) {
      processImageLocally();
    }
  }, [preset, strength, saturation, brightness, contrast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
    setColoredImage(null);
    setHasPaid(false); // Reset payment state for new image
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processImageLocally = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const img = new Image();
      img.src = originalImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas not supported.");
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const stops = PRESETS[preset].stops;
      
      // Precompute color map
      const colorMap = new Array(256);
      for (let i = 0; i < 256; i++) {
        let r, g, b;
        if (i < 128) {
          const t = i / 128;
          r = stops[0][0] + t * (stops[1][0] - stops[0][0]);
          g = stops[0][1] + t * (stops[1][1] - stops[0][1]);
          b = stops[0][2] + t * (stops[1][2] - stops[0][2]);
        } else {
          const t = (i - 128) / 127;
          r = stops[1][0] + t * (stops[2][0] - stops[1][0]);
          g = stops[1][1] + t * (stops[2][1] - stops[1][1]);
          b = stops[1][2] + t * (stops[2][2] - stops[1][2]);
        }
        colorMap[i] = [r, g, b];
      }

      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        // Luminance
        let L = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Map color
        const mapped = colorMap[Math.floor(L)];
        
        // Blend with original based on strength
        let outR = L + (mapped[0] - L) * strength;
        let outG = L + (mapped[1] - L) * strength;
        let outB = L + (mapped[2] - L) * strength;

        // Brightness
        outR += brightness;
        outG += brightness;
        outB += brightness;

        // Contrast
        outR = contrastFactor * (outR - 128) + 128;
        outG = contrastFactor * (outG - 128) + 128;
        outB = contrastFactor * (outB - 128) + 128;

        // Saturation
        const L_out = 0.299 * outR + 0.587 * outG + 0.114 * outB;
        outR = L_out + (outR - L_out) * saturation;
        outG = L_out + (outG - L_out) * saturation;
        outB = L_out + (outB - L_out) * saturation;

        data[i] = Math.min(255, Math.max(0, outR));
        data[i+1] = Math.min(255, Math.max(0, outG));
        data[i+2] = Math.min(255, Math.max(0, outB));
      }

      ctx.putImageData(imageData, 0, 0);
      setColoredImage(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error(err);
      setError("Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleColorize = async () => {
    if (!originalImage) return;

    const isAdmin = user?.role === "admin";
    if (!isAdmin && user && user.credit_balance < creditCost && !hasPaid) {
      setError("Insufficient credits to colorize this image.");
      return;
    }

    setError(null);

    if (!hasPaid) {
      // Deduct credits
      const { error: rpcError } = await supabase.rpc("execute_tool", {
        p_tool_id: toolId || 0,
      });

      if (rpcError) {
        console.error("Credit deduction error:", rpcError);
      }

      if (user && !isAdmin) {
        updateUser({ 
          credit_balance: user.credit_balance - creditCost,
          total_spent: (user.total_spent || 0) + creditCost
        });
      }
      setHasPaid(true);
    }

    await processImageLocally();
  };

  const handleDownload = () => {
    if (!coloredImage) return;
    const link = document.createElement("a");
    link.href = coloredImage;
    link.download = `colorized-${preset}.png`;
    link.click();
  };

  const reset = () => {
    setOriginalImage(null);
    setColoredImage(null);
    setError(null);
    setHasPaid(false);
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
              Image Colorizer
              <Palette className="w-6 h-6 ml-2 text-indigo-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Convert B&W to Color locally in your browser</p>
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
                <h3 className="font-bold text-slate-900 dark:text-white">Color Settings</h3>
                <button 
                  onClick={reset}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    Color Preset
                  </label>
                  <select 
                    value={preset}
                    onChange={(e) => setPreset(e.target.value as PresetKey)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.entries(PRESETS).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Color Strength</span>
                      <span className="text-slate-700 dark:text-slate-300">{Math.round(strength * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={strength} onChange={(e) => setStrength(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Saturation</span>
                      <span className="text-slate-700 dark:text-slate-300">{Math.round(saturation * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="2" step="0.1" value={saturation} onChange={(e) => setSaturation(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Brightness</span>
                      <span className="text-slate-700 dark:text-slate-300">{brightness}</span>
                    </div>
                    <input type="range" min="-100" max="100" step="5" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Contrast</span>
                      <span className="text-slate-700 dark:text-slate-300">{contrast}</span>
                    </div>
                    <input type="range" min="-100" max="100" step="5" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                  </div>
                </div>
              </div>

              {!hasPaid ? (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Cost</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center">
                      <span className="mr-1">💳</span>
                      {creditCost} Credits
                    </span>
                  </div>
                  <button 
                    onClick={handleColorize}
                    disabled={isProcessing}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                  >
                    {isProcessing ? "Processing..." : (
                      <>
                        <Wand2 className="w-5 h-5 mr-2" />
                        Colorize Image
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-2 rounded-lg text-center mb-2">
                    ✓ Unlocked. Adjustments apply instantly.
                  </div>
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
                    Colorize Another
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
                  
                  {!coloredImage ? (
                    <div className="relative max-w-full max-h-full group flex items-center justify-center">
                      <img 
                        src={originalImage} 
                        alt="Preview" 
                        className={`relative max-w-full max-h-[600px] rounded-lg shadow-2xl transition-all duration-500 ${isProcessing ? "blur-sm opacity-50" : "grayscale"}`}
                      />
                    </div>
                  ) : (
                    /* Slider View */
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" ref={containerRef}>
                      <div className="relative max-w-full max-h-full aspect-auto">
                        {/* Colored Image (Bottom) */}
                        <div className="relative">
                          <img src={coloredImage} alt="Colorized" className="max-w-full max-h-[600px] rounded-lg shadow-xl" />
                        </div>
                        
                        {/* Original Image (Top, Clipped) */}
                        <div 
                          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img 
                            src={originalImage} 
                            alt="Original" 
                            className="max-w-none h-full object-cover grayscale" 
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
                            B&W
                          </div>
                          <div className="absolute top-4 right-4 bg-indigo-600/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md transform translate-x-full ml-4">
                            Color
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
                100% Offline Processing
              </div>
              <div className="flex items-center">
                <Sliders className="w-4 h-4 text-indigo-500 mr-2" />
                Real-time Adjustments
              </div>
              <div className="flex items-center">
                <Palette className="w-4 h-4 text-amber-500 mr-2" />
                Gradient Mapping
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
