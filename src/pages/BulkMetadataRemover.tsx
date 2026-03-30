import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eraser, 
  Download, 
  Trash2, 
  Upload, 
  X,
  FileArchive,
  ShieldCheck,
  Loader2,
  Info
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  processedBlob?: Blob;
  originalSize: number;
  newSize?: number;
}

export default function BulkMetadataRemover() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newImages: ImageFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        status: 'idle',
        originalSize: file.size
      }));
    
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const clearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  }, [images]);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
    };
  }, []); // Empty dependency array to only run on unmount

  const stripMetadata = async (imageFile: ImageFile): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Drawing to canvas strips EXIF data because it only copies pixel data
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, imageFile.file.type, 0.85); // 0.85 quality to balance size and prevent bloat
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageFile.preview;
    });
  };

  const processAll = async () => {
    setIsProcessing(true);
    
    // Mark all idle as processing
    setImages(prev => prev.map(img => img.status === 'idle' ? { ...img, status: 'processing' } : img));

    // Process in small batches (chunks) to balance speed and memory
    const CONCURRENCY_LIMIT = 4;
    const pendingImages = images.filter(img => img.status !== 'done');

    for (let i = 0; i < pendingImages.length; i += CONCURRENCY_LIMIT) {
      const chunk = pendingImages.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(chunk.map(async (img) => {
        try {
          const blob = await stripMetadata(img);
          
          // Update state for this specific image to show progress
          setImages(prev => prev.map(p => 
            p.id === img.id 
              ? { ...p, processedBlob: blob, newSize: blob.size, status: 'done' as const } 
              : p
          ));
        } catch (error) {
          console.error('Failed to process image:', error);
          setImages(prev => prev.map(p => 
            p.id === img.id ? { ...p, status: 'error' as const } : p
          ));
        }
      }));
      
      // Yield to main thread after each batch to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    setIsProcessing(false);
  };

  const downloadSingle = (img: ImageFile) => {
    if (!img.processedBlob) return;
    saveAs(img.processedBlob, `cleaned_${img.file.name}`);
  };

  const downloadAllIndividual = async () => {
    const doneImages = images.filter(img => img.status === 'done' && img.processedBlob);
    if (doneImages.length === 0) return;
    
    for (const img of doneImages) {
      downloadSingle(img);
      // Small delay to help browser handle multiple downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const downloadAllZip = async () => {
    const doneImages = images.filter(img => img.status === 'done' && img.processedBlob);
    if (doneImages.length === 0) return;
    
    const zip = new JSZip();
    doneImages.forEach((img) => {
      if (img.processedBlob) {
        zip.file(`cleaned_${img.file.name}`, img.processedBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'cleaned_images.zip');
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const allDone = images.length > 0 && images.every(img => img.status === 'done');
  const hasIdle = images.some(img => img.status === 'idle');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 mb-2"
          >
            <Eraser className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Metadata <span className="text-emerald-600">Remover</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            Protect your privacy by stripping EXIF data, GPS location, and camera details from your images before sharing them online.
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-[2.5rem] border-4 border-dashed transition-all duration-300 p-12 text-center ${
            isDragging 
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-600'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
            accept="image/*"
            className="hidden"
          />
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                Drop images here to clean metadata
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Supports JPG, PNG, WebP. Select multiple files at once.
              </p>
            </div>
          </div>
        </div>

        {/* Controls & Grid */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {/* Sticky Action Bar */}
              <div className="sticky top-4 z-20 flex flex-col lg:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none">
                
                {/* Left side: Info & Process */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full lg:w-auto">
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl font-bold text-sm whitespace-nowrap">
                    {images.length} Images
                  </div>
                  
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                  
                  {hasIdle && (
                    <button
                      onClick={processAll}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eraser className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{isProcessing ? 'Cleaning...' : 'CLEAN METADATA'}</span>
                      <span className="sm:hidden">{isProcessing ? 'Cleaning...' : 'CLEAN'}</span>
                    </button>
                  )}
                  {allDone && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/30 text-green-600 rounded-xl font-bold text-sm border border-green-200 dark:border-green-900/50">
                      <ShieldCheck className="w-4 h-4" />
                      All Cleaned
                    </div>
                  )}
                </div>

                {/* Right side: Downloads & Clear */}
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full lg:w-auto">
                  <button
                    onClick={clearAll}
                    className="p-2 sm:px-4 sm:py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                    title="Clear All"
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                  
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

                  <button
                    onClick={downloadAllIndividual}
                    disabled={!allDone}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">SAVE FILES</span>
                    <span className="sm:hidden">FILES</span>
                  </button>
                  <button
                    onClick={downloadAllZip}
                    disabled={!allDone}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <FileArchive className="w-4 h-4" />
                    <span className="hidden sm:inline">SAVE ZIP</span>
                    <span className="sm:hidden">ZIP</span>
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {images.map((img) => (
                  <motion.div
                    layout
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Image Preview Container */}
                    <div className="relative aspect-square bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center p-4 overflow-hidden">
                      <img
                        src={img.preview}
                        alt="Preview"
                        className={`max-w-full max-h-full object-contain drop-shadow-md rounded-md transition-opacity ${img.status === 'processing' ? 'opacity-50' : 'opacity-100'}`}
                      />
                      
                      {/* Status Overlay */}
                      {img.status === 'processing' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-slate-900/20 backdrop-blur-[2px]">
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        </div>
                      )}
                      {img.status === 'done' && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white p-1.5 rounded-full shadow-md">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      )}

                      {/* Top Right Actions (Delete) */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeImage(img.id)}
                          className="p-1.5 bg-white/90 dark:bg-slate-800/90 text-red-500 hover:text-red-600 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-slate-700 transition-all backdrop-blur-sm"
                          title="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Info Footer */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate" title={img.file.name}>
                        {img.file.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400 line-through">
                          {formatSize(img.originalSize)}
                        </span>
                        {img.newSize && (
                          <span className="text-xs font-bold text-emerald-600">
                            {formatSize(img.newSize)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State Info */}
        {images.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'Privacy First', desc: 'Removes GPS coordinates, camera models, and other hidden EXIF data.' },
              { icon: Eraser, title: 'Bulk Cleaning', desc: 'Process dozens of images instantly right in your browser. No server uploads.' },
              { icon: FileArchive, title: 'Easy Export', desc: 'Download your cleaned images individually or packed in a ZIP file.' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
