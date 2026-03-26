import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { 
  Images, 
  Upload, 
  Download, 
  Settings, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  Zap,
  Trash2,
  FileArchive,
  FileText,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageItem {
  id: string;
  file: File;
  compressedFile: File | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  error?: string;
}

export default function BulkImageCompressor() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [maxSizeMB, setMaxSizeMB] = useState<number>(1);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState<number>(1920);
  const [initialQuality, setInitialQuality] = useState<number>(0.8);
  const [preserveExif, setPreserveExif] = useState<boolean>(false);
  const [outputType, setOutputType] = useState<string>('image/jpeg');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const stopProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newImages: ImageItem[] = files
        .filter(file => file.type.startsWith('image/'))
        .map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          compressedFile: null,
          status: 'idle'
        }));
      
      setImages(prev => [...prev, ...newImages]);
      setOverallProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAll = () => {
    setImages([]);
    setOverallProgress(0);
    stopProcessingRef.current = true;
  };

  const compressSingle = async (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img || img.status === 'processing') return;

    setImages(prev => prev.map(i => i.id === id ? { ...i, status: 'processing', error: undefined } : i));

    try {
      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        initialQuality,
        preserveExif,
        fileType: outputType,
      };

      const compressedFile = await imageCompression(img.file, options);

      setImages(prev => prev.map(i => i.id === id ? { 
        ...i, 
        compressedFile, 
        status: 'done' 
      } : i));
    } catch (err: any) {
      console.error('Compression error:', err);
      setImages(prev => prev.map(i => i.id === id ? { 
        ...i, 
        status: 'error', 
        error: err?.message || 'Compression failed' 
      } : i));
    }
  };

  const compressAll = async () => {
    if (images.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);
    stopProcessingRef.current = false;
    setOverallProgress(0);

    let completedCount = 0;
    const totalCount = images.filter(img => img.status !== 'done').length;

    for (const img of images) {
      if (stopProcessingRef.current) break;
      if (img.status !== 'done') {
        await compressSingle(img.id);
        completedCount++;
        setOverallProgress(Math.round((completedCount / totalCount) * 100));
      }
    }

    setIsProcessingAll(false);
  };

  const stopProcessing = () => {
    stopProcessingRef.current = true;
    setIsProcessingAll(false);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    const doneImages = images.filter(img => img.compressedFile);
    
    if (doneImages.length === 0) return;

    doneImages.forEach(img => {
      zip.file(`compressed_${img.file.name}`, img.compressedFile!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'compressed_images.zip';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const doneImages = images.filter(img => img.compressedFile);
    if (doneImages.length === 0) return;

    const pdf = new jsPDF();
    
    for (let i = 0; i < doneImages.length; i++) {
      const img = doneImages[i];
      if (i > 0) pdf.addPage();
      
      // Create temporary preview for PDF generation
      const tempPreview = URL.createObjectURL(img.compressedFile!);
      const imgProps = pdf.getImageProperties(tempPreview);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(tempPreview, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      URL.revokeObjectURL(tempPreview);
    }

    pdf.save('compressed_images.pdf');
  };

  const downloadAll = async () => {
    const doneImages = images.filter(img => img.compressedFile);
    if (doneImages.length === 0) return;

    for (const img of doneImages) {
      const url = URL.createObjectURL(img.compressedFile!);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compressed_${img.file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      // Small delay to prevent browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const applyPreset = (preset: 'small' | 'balanced' | 'high') => {
    switch (preset) {
      case 'small':
        setMaxSizeMB(0.5);
        setMaxWidthOrHeight(1080);
        setInitialQuality(0.6);
        break;
      case 'balanced':
        setMaxSizeMB(1.5);
        setMaxWidthOrHeight(1920);
        setInitialQuality(0.8);
        break;
      case 'high':
        setMaxSizeMB(5);
        setMaxWidthOrHeight(3840);
        setInitialQuality(0.95);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">BULK IMAGE COMPRESSOR</h1>
            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">100% Private & Offline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-orange-500" />
                  <span>Global Settings</span>
                </h2>
                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['small', 'balanced', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Output Format</label>
                    <select 
                      value={outputType}
                      onChange={(e) => setOutputType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="image/jpeg">JPEG</option>
                      <option value="image/png">PNG</option>
                      <option value="image/webp">WebP</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={preserveExif}
                          onChange={(e) => setPreserveExif(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${preserveExif ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${preserveExif ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Metadata</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Quality</label>
                    <span className="text-xs font-bold text-orange-500">{Math.round(initialQuality * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1" 
                    step="0.05"
                    value={initialQuality}
                    onChange={(e) => setInitialQuality(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Max Size (MB)</label>
                    <span className="text-xs font-bold text-orange-500">{maxSizeMB} MB</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="10" 
                    step="0.1"
                    value={maxSizeMB}
                    onChange={(e) => setMaxSizeMB(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Max Dimension (px)</label>
                    <span className="text-xs font-bold text-orange-500">{maxWidthOrHeight}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max="4000" 
                    step="100"
                    value={maxWidthOrHeight}
                    onChange={(e) => setMaxWidthOrHeight(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  {isProcessingAll ? (
                    <button
                      onClick={stopProcessing}
                      className="w-full py-4 rounded-2xl font-bold text-sm bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Stop Processing</span>
                    </button>
                  ) : (
                    <button
                      onClick={compressAll}
                      disabled={images.length === 0}
                      className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                        images.length === 0
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.98]'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>Compress All ({images.length})</span>
                    </button>
                  )}

                  {images.some(img => img.status === 'done') && (
                    <div className="space-y-3">
                      <button
                        onClick={downloadAll}
                        className="w-full py-3 px-4 bg-green-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                      >
                        <Download className="w-4 h-4" />
                        <span>Save All Individually</span>
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={downloadZip}
                          className="py-3 px-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-colors"
                        >
                          <FileArchive className="w-4 h-4" />
                          <span>ZIP</span>
                        </button>
                        <button
                          onClick={downloadPdf}
                          className="py-3 px-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: List & Upload */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Images className="w-4 h-4 text-orange-500" />
                  <span>Image Queue</span>
                </h2>
                {images.length > 0 && (
                  <button 
                    onClick={clearAll}
                    className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                {images.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center group hover:border-orange-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Drop images here</h3>
                    <p className="text-xs text-slate-500 max-w-[200px]">Select multiple images to compress them in bulk.</p>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden"
                      ref={fileInputRef}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isProcessingAll && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overall Progress</span>
                          <span className="text-[10px] font-bold text-orange-500">{overallProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${overallProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {images.map((img) => (
                          <motion.div
                            key={img.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 group relative"
                          >
                            <button 
                              onClick={() => removeImage(img.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
  
                            <div className="flex space-x-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center relative">
                                {img.status === 'processing' ? (
                                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                ) : img.status === 'done' ? (
                                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                                ) : (
                                  <FileImage className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
  
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1">{img.file.name}</p>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold text-slate-500">{formatSize(img.file.size)}</span>
                                    {img.compressedFile && (
                                      <>
                                        <span className="text-[10px] font-bold text-slate-400">→</span>
                                        <span className="text-[10px] font-bold text-green-500">{formatSize(img.compressedFile.size)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
  
                                <div className="flex items-center justify-between mt-2">
                                  {img.status === 'error' ? (
                                    <div className="flex items-center space-x-1 text-red-500" title={img.error}>
                                      <AlertCircle className="w-3 h-3" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[80px]">{img.error || 'Error'}</span>
                                    </div>
                                  ) : (
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${img.status === 'done' ? 'text-green-500' : 'text-slate-400'}`}>
                                      {img.status === 'done' ? 'Compressed' : img.status === 'processing' ? 'Processing...' : 'Ready'}
                                    </div>
                                  )}
  
                                  <div className="flex space-x-2">
                                    {img.status === 'done' && img.compressedFile && (
                                      <button 
                                        onClick={() => {
                                          const url = URL.createObjectURL(img.compressedFile!);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = `compressed_${img.file.name}`;
                                          link.click();
                                          URL.revokeObjectURL(url);
                                        }}
                                        className="p-2 bg-white dark:bg-slate-700 hover:bg-orange-500 hover:text-white rounded-lg transition-all text-slate-400 shadow-sm"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                    )}
                                    {img.status === 'idle' && (
                                      <button 
                                        onClick={() => compressSingle(img.id)}
                                        className="p-2 bg-white dark:bg-slate-700 hover:bg-orange-500 hover:text-white rounded-lg transition-all text-slate-400 shadow-sm"
                                      >
                                        <Zap className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-orange-400 transition-colors group min-h-[80px]"
                      >
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors mb-1" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add More</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {images.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {images.filter(i => i.status === 'done').length} / {images.length} Completed
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileInputRef}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-orange-800 dark:text-orange-200 flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4" />
            <span>Bulk Processing Power</span>
          </h3>
          <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
            Process dozens of images at once. All compression happens locally in your browser using Web Workers, ensuring maximum speed and privacy. 
            Once finished, you can download images individually, as a <strong>ZIP archive</strong>, or combined into a single <strong>PDF document</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
