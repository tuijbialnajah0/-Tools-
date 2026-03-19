import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Upload, X, CheckCircle2, AlertCircle, Download, MessageCircle, Briefcase, Plus, Crop } from "lucide-react";
import JSZip from "jszip";
import CropWorker from "../workers/cropWorker?worker";

const MAX_PICS = 30;

interface StickerFile {
  id: string;
  file: File;
  preview: string;
}

export function WhatsappSCreate() {
  const [stickers, setStickers] = useState<StickerFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packName, setPackName] = useState("My Sticker Pack");
  const [showInstructions, setShowInstructions] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Crop state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropRatio, setCropRatio] = useState<number>(1); // 1:1 default, 0 for custom
  const [customRatioW, setCustomRatioW] = useState<number>(1);
  const [customRatioH, setCustomRatioH] = useState<number>(1);
  const [isCropping, setIsCropping] = useState(false);
  const [cropProgress, setCropProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stickers.length > 0 && step === 1) {
      setStep(2);
    } else if (stickers.length === 0 && step === 2) {
      setStep(1);
    }
  }, [stickers.length]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      stickers.forEach(s => URL.revokeObjectURL(s.preview));
    };
  }, []);

  const creditCost = stickers.length === 0 ? 0 : 150;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null);
    setResultUrl(null);
    
    const validFiles: StickerFile[] = [];

    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        setError("Unsupported file format. Please upload images only.");
        continue;
      }
      
      validFiles.push({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file)
      });
    }

    if (validFiles.length > 0) {
      setStickers((prev) => {
        const combined = [...prev, ...validFiles];
        if (combined.length > MAX_PICS) {
          setError(`You can only select up to ${MAX_PICS} pictures.`);
          return combined.slice(0, MAX_PICS);
        }
        return combined;
      });
    }
  };

  const removeSticker = (id: string) => {
    setStickers((prev) => {
      const newStickers = prev.filter(s => s.id !== id);
      const removed = prev.find(s => s.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return newStickers;
    });
  };

  const handleAutoCrop = async () => {
    if (stickers.length === 0) return;
    
    setIsCropping(true);
    setCropProgress(0);
    
    const targetRatio = cropRatio === 0 ? customRatioW / customRatioH : cropRatio;
    const newStickers: StickerFile[] = [];
    
    const worker = new CropWorker();
    
    try {
      for (let i = 0; i < stickers.length; i++) {
        const sticker = stickers[i];
        
        const img = new Image();
        img.src = sticker.preview;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const scale = Math.min(1, 256 / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        
        const cropResult = await new Promise<{cropX: number, cropY: number, cropW: number, cropH: number}>((resolve) => {
          worker.onmessage = (e) => resolve(e.data);
          worker.postMessage({ id: sticker.id, imageData, targetRatio });
        });
        
        const cropX = cropResult.cropX / scale;
        const cropY = cropResult.cropY / scale;
        const cropW = cropResult.cropW / scale;
        const cropH = cropResult.cropH / scale;
        
        const outCanvas = document.createElement('canvas');
        outCanvas.width = cropW;
        outCanvas.height = cropH;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) {
          outCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          
          const blob = await new Promise<Blob | null>((resolve) => outCanvas.toBlob(resolve, sticker.file.type));
          if (blob) {
            const newFile = new File([blob], sticker.file.name, { type: sticker.file.type });
            newStickers.push({
              id: Math.random().toString(36).substring(7),
              file: newFile,
              preview: URL.createObjectURL(newFile)
            });
            URL.revokeObjectURL(sticker.preview);
          }
        }
        
        setCropProgress(Math.round(((i + 1) / stickers.length) * 100));
      }
      
      setStickers(newStickers);
    } catch (err) {
      console.error("Cropping error:", err);
      setError("An error occurred during cropping.");
    } finally {
      worker.terminate();
      setIsCropping(false);
      setShowCropModal(false);
    }
  };

  const convertToWebP = async (file: File, size: number = 512): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');
        
        ctx.clearRect(0, 0, size, size);
        
        const ratio = Math.min(size / img.width, size / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        
        ctx.drawImage(img, x, y, w, h);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Blob creation failed');
        }, 'image/webp', 0.8);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const createStickerPack = async () => {
    if (stickers.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const zip = new JSZip();
      
      zip.file("title.txt", packName.trim() || "My Sticker Pack");
      zip.file("author.txt", "ͲႮᏆᎫᏴᏆᎪᏞΝΑᎫΑΉ·Kҽɳƈԋσ Aʅʅιαɳƈҽ");
      
      const trayBlob = await convertToWebP(stickers[0].file, 96);
      zip.file("tray.png", trayBlob);

      for (let i = 0; i < stickers.length; i++) {
        const webpBlob = await convertToWebP(stickers[i].file, 512);
        zip.file(`${i + 1}.webp`, webpBlob);
        setProgress(Math.round(((i + 1) / stickers.length) * 90));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const customBlob = new Blob([zipBlob], { type: "application/octet-stream" });
      
      const url = URL.createObjectURL(customBlob);
      setResultUrl(url);
      setProgress(100);
      setStep(3);

    } catch (err: any) {
      console.error("Sticker pack creation error:", err);
      setError(err.message || "Failed to create sticker pack. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    stickers.forEach(s => URL.revokeObjectURL(s.preview));
    setStickers([]);
    setResultUrl(null);
    setError(null);
    setProgress(0);
    setPackName("My Sticker Pack");
    setShowInstructions(false);
    setStep(1);
  };

  const handleDownloadPack = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `${(packName.trim() || 'sticker-pack').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wastickers`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowInstructions(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              Whatsapp-S-Create
              <MessageCircle className="w-8 h-8 ml-3 text-green-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Create WhatsApp sticker packs from your pictures.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input for both steps */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {step === 1 && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center hover:border-green-500 dark:hover:border-green-500 transition-all bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer"
          >
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Upload Pictures</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              Drag and drop your images here, or click to browse. Max 30 pictures per pack.
            </p>
            <button
              className="px-10 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 dark:shadow-none transform hover:scale-105 active:scale-95"
            >
              Select Images
            </button>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Selected Images</h3>
                  <p className="text-sm text-slate-500">{stickers.length} of {MAX_PICS} slots used</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowCropModal(true)}
                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold flex items-center hover:bg-indigo-100 transition-colors"
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Auto Crop
                  </button>
                  <button 
                    onClick={() => { setStickers([]); setStep(1); }}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stickers.map((sticker) => (
                  <div key={sticker.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <img 
                      src={sticker.preview} 
                      alt="Sticker preview" 
                      className="w-full h-full object-contain p-2"
                    />
                    <button
                      onClick={() => removeSticker(sticker.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {stickers.length < MAX_PICS && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-green-500 hover:text-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Add More</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                Pack Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Pack Name
                  </label>
                  <input
                    type="text"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    placeholder="Enter pack name..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                    Author: ͲႮᏆᎫᏴᏆᎪᏞΝΑᎫΑΗ·Kҽɳƈԋσ Aʅʅιαɳƈҽ
                  </p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                    WhatsApp Specs
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400 font-medium">
                    <li className="flex items-center"><div className="w-1 h-1 bg-green-400 rounded-full mr-2" /> Format: WebP</li>
                    <li className="flex items-center"><div className="w-1 h-1 bg-green-400 rounded-full mr-2" /> Resolution: 512x512px</li>
                    <li className="flex items-center"><div className="w-1 h-1 bg-green-400 rounded-full mr-2" /> Max Size: 100 KB per sticker</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={createStickerPack}
                disabled={isProcessing || stickers.length === 0}
                className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl transition-all flex items-center justify-center transform active:scale-95 ${
                  isProcessing || stickers.length === 0
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="animate-pulse">Processing {progress}%</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 mr-3" />
                    Generate Pack
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto p-8 md:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Pack Created!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Your sticker pack is ready. Download it and open with any sticker maker app.
          </p>
          
          <div className="flex flex-col gap-4 justify-center max-w-md mx-auto mb-8">
            <button
              onClick={handleDownloadPack}
              className="w-full py-5 bg-green-600 hover:bg-green-700 text-white font-black text-lg rounded-3xl shadow-xl shadow-green-200 dark:shadow-none transition-all flex items-center justify-center transform hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-6 h-6 mr-3" />
              Download Pack
            </button>
            
            <button
              onClick={reset}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Create Another Pack
            </button>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <Crop className="w-6 h-6 mr-2 text-indigo-600" />
                Auto Crop
              </h3>
              {!isCropping && (
                <button onClick={() => setShowCropModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-8 h-8" />
                </button>
              )}
            </div>
            
            {isCropping ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Cropping Images...</h3>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${cropProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium">
                  Choose a crop ratio that will be applied to all images in this pack.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { label: '1:1 Square', value: 1 },
                    { label: '4:5 Portrait', value: 0.8 },
                    { label: '16:9 Wide', value: 1.77 },
                    { label: '9:16 Story', value: 0.56 },
                    { label: 'Custom', value: 0 },
                  ].map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => setCropRatio(ratio.value)}
                      className={`px-4 py-4 rounded-2xl border-2 font-bold transition-all text-sm ${
                        cropRatio === ratio.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 scale-105'
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>

                {cropRatio === 0 && (
                  <div className="flex items-center space-x-4 mb-8 animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Width</label>
                      <input 
                        type="number" 
                        min="1"
                        value={customRatioW}
                        onChange={(e) => setCustomRatioW(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="text-slate-400 font-bold mt-5">:</div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Height</label>
                      <input 
                        type="number" 
                        min="1"
                        value={customRatioH}
                        onChange={(e) => setCustomRatioH(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAutoCrop}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none transform active:scale-95"
                >
                  Apply to All
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                Download Complete
              </h3>
              <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your sticker pack has been downloaded as a <span className="font-semibold text-slate-800 dark:text-slate-200">.wastickers</span> file.
              </p>
              
              <div className="space-y-8">
                <h4 className="font-semibold text-slate-900 dark:text-white">To add it to WhatsApp:</h4>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                    1
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm space-y-2 pt-1.5">
                    <p>• Go to downloads ↓</p>
                    <img src="https://files.catbox.moe/ymxrw2.jpg" alt="Step 1" className="rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-xs" referrerPolicy="no-referrer" />
                    <p>• Click on 3 dot option</p>
                    <p>• Click on share button</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                    2
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm space-y-2 pt-1.5">
                    <img src="https://files.catbox.moe/anw68v.jpg" alt="Step 2" className="rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-xs" referrerPolicy="no-referrer" />
                    <p>• Select any sticker maker app</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                    3
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm space-y-2 pt-1.5">
                    <p>• Add your sticker pack to library</p>
                    <img src="https://files.catbox.moe/gqap6u.jpg" alt="Step 3" className="rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-xs" referrerPolicy="no-referrer" />
                    <p>• Later you can add to WhatsApp Messenger / Whatsapp Business</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
