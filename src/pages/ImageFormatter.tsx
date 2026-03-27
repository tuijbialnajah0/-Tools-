import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image as ImageIcon, Download, Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif' | 'image/bmp' | 'image/gif' | 'image/x-icon' | 'image/tiff';

export default function ImageFormatter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/png');
  const [quality, setQuality] = useState<number>(90);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formats: { value: ImageFormat; label: string; ext: string }[] = [
    { value: 'image/png', label: 'PNG', ext: 'png' },
    { value: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
    { value: 'image/webp', label: 'WebP', ext: 'webp' },
    { value: 'image/avif', label: 'AVIF', ext: 'avif' },
    { value: 'image/bmp', label: 'BMP', ext: 'bmp' },
    { value: 'image/gif', label: 'GIF', ext: 'gif' },
    { value: 'image/x-icon', label: 'ICO', ext: 'ico' },
    { value: 'image/tiff', label: 'TIFF', ext: 'tiff' },
  ];

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isValidExt = /\.(jpg|jpeg|png|webp|avif|gif|bmp|ico|tiff|svg)$/i.test(file.name);
      if (!file.type.startsWith('image/') && !isValidExt) {
        setError('Please select a valid image file.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isValidExt = /\.(jpg|jpeg|png|webp|avif|gif|bmp|ico|tiff|svg)$/i.test(file.name);
      if (!file.type.startsWith('image/') && !isValidExt) {
        setError('Please drop a valid image file.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const resetTool = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertImage = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsConverting(true);
    setError(null);
    setSuccess(false);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewUrl;
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      // Fill with white background for formats that don't support transparency (like JPEG)
      if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const qualityParam = (targetFormat === 'image/jpeg' || targetFormat === 'image/webp') 
        ? quality / 100 
        : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError("Failed to convert image.");
            setIsConverting(false);
            return;
          }

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          const originalName = selectedFile.name.split('.')[0];
          const ext = formats.find(f => f.value === targetFormat)?.ext || 'png';
          a.download = `${originalName}-converted.${ext}`;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setSuccess(true);
          setIsConverting(false);
        },
        targetFormat,
        qualityParam
      );

    } catch (err) {
      console.error("Conversion error:", err);
      setError("An error occurred during conversion.");
      setIsConverting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showQualitySlider = targetFormat === 'image/jpeg' || targetFormat === 'image/webp';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/10"
          >
            <ImageIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Image Formatter
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Convert your images to any format instantly. 100% offline, secure, and fast.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-8 sm:p-12">
            
            {!selectedFile ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-3 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Drop your image here
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  or click to browse from your device
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">
                  Supports PNG, JPG, WEBP, GIF, BMP
                </p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12"
              >
                {/* Left: Preview */}
                <div className="space-y-6">
                  <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group">
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain p-4"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={resetTool}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Change Image
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-500 dark:text-slate-400">Original File:</span>
                      <span className="text-slate-900 dark:text-white truncate max-w-[200px]" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium mt-2">
                      <span className="text-slate-500 dark:text-slate-400">Format:</span>
                      <span className="text-slate-900 dark:text-white uppercase">
                        {selectedFile.type.replace('image/', '') || selectedFile.name.split('.').pop()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium mt-2">
                      <span className="text-slate-500 dark:text-slate-400">Size:</span>
                      <span className="text-slate-900 dark:text-white">{formatSize(selectedFile.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="space-y-8 flex flex-col justify-center">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      Conversion Settings
                    </h3>
                    
                    <div className="space-y-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                      
                      {/* Format Selection */}
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                          Target Format
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {formats.map((f) => (
                            <button
                              key={f.value}
                              onClick={() => setTargetFormat(f.value)}
                              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                                targetFormat === f.value
                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quality Slider */}
                      <AnimatePresence>
                        {showQualitySlider && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            <div className="flex justify-between items-center">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                Image Quality
                              </label>
                              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                                {quality}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={quality}
                              onChange={(e) => setQuality(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Lower quality reduces file size but may degrade image clarity.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>

                  {/* Status Messages */}
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 font-medium border border-red-100 dark:border-red-900/30"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-3 font-medium border border-emerald-100 dark:border-emerald-900/30"
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <p>Image converted and downloaded successfully!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={resetTool}
                      className="w-1/3 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Clear
                    </button>
                    <button
                      onClick={convertImage}
                      disabled={isConverting}
                      className={`w-2/3 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${
                        isConverting 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1'
                      }`}
                    >
                      {isConverting ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <Download className="w-6 h-6" />
                          Convert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hidden Input & Canvas */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />
            
          </div>
        </div>
      </div>
    </div>
  );
}
