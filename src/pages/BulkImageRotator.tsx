import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCw, 
  RotateCcw,
  Download, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  X,
  FileArchive,
  RefreshCw,
  Layers
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  rotation: number; // 0, 90, 180, 270
  status: 'idle' | 'processing' | 'done' | 'error';
}

export default function BulkImageRotator() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newImages: ImageFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        rotation: 0,
        status: 'idle'
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

  const rotateImage = (id: string, degrees: number = 90) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, rotation: (img.rotation + degrees) % 360 } : img
    ));
  };

  const rotateAll = (degrees: number) => {
    setImages(prev => prev.map(img => ({ ...img, rotation: (img.rotation + degrees) % 360 })));
  };

  const getRotatedImageBlob = async (imageFile: ImageFile): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        const angle = (imageFile.rotation * Math.PI) / 180;
        const isVertical = imageFile.rotation === 90 || imageFile.rotation === 270;

        canvas.width = isVertical ? img.height : img.width;
        canvas.height = isVertical ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, imageFile.file.type);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageFile.preview;
    });
  };

  const downloadSingle = async (imageFile: ImageFile) => {
    try {
      const blob = await getRotatedImageBlob(imageFile);
      saveAs(blob, `rotated_${imageFile.file.name}`);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const downloadAllIndividual = async () => {
    if (images.length === 0) return;
    for (const img of images) {
      await downloadSingle(img);
      // Small delay to help browser handle multiple downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const downloadAll = async () => {
    if (images.length === 0) return;
    
    const zip = new JSZip();
    
    // Process in small batches (chunks) to balance speed and memory
    const CONCURRENCY_LIMIT = 4;
    
    for (let i = 0; i < images.length; i += CONCURRENCY_LIMIT) {
      const chunk = images.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(chunk.map(async (img) => {
        try {
          const blob = await getRotatedImageBlob(img);
          zip.file(`rotated_${img.file.name}`, blob);
        } catch (error) {
          console.error('Failed to process image for zip:', error);
        }
      }));
      
      // Yield to main thread after each batch
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'rotated_images.zip');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 mb-2"
          >
            <RotateCw className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Bulk <span className="text-indigo-600">Image Rotator</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            Rotate multiple images at once. Individually adjust each image by 90° and download them all in a single ZIP or one by one.
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
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600'
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                Drop your images here or click to browse
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Supports JPG, PNG, WebP and more. Select multiple files at once.
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
              {/* Action Bar */}
              <div className="sticky top-4 z-20 flex flex-col lg:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none">
                
                {/* Left side: Info & Bulk Rotate */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full lg:w-auto">
                  <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 rounded-xl font-bold text-sm whitespace-nowrap">
                    {images.length} Images
                  </div>
                  
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                  
                  <button
                    onClick={() => rotateAll(-90)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Rotate All Left</span>
                  </button>
                  <button
                    onClick={() => rotateAll(90)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Rotate All Right</span>
                  </button>
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
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">SAVE FILES</span>
                    <span className="sm:hidden">FILES</span>
                  </button>
                  <button
                    onClick={downloadAll}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm"
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
                      <motion.img
                        animate={{ rotate: img.rotation }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        src={img.preview}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain drop-shadow-md rounded-md"
                      />
                      
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

                    {/* Always-visible Controls */}
                    <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700">
                      <button
                        onClick={() => rotateImage(img.id, -90)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors"
                        title="Rotate Left"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="sm:hidden md:inline">Left</span>
                      </button>
                      <button
                        onClick={() => rotateImage(img.id, 90)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors"
                        title="Rotate Right"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span className="sm:hidden md:inline">Right</span>
                      </button>
                    </div>

                    {/* Minimal Info Footer */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate flex-1" title={img.file.name}>
                        {img.file.name}
                      </p>
                      <div className="flex items-center gap-1 text-indigo-600 font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-md">
                        {img.rotation}°
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
              { icon: RotateCw, title: '90° Precision', desc: 'Rotate images in 90-degree increments with instant visual feedback.' },
              { icon: Layers, title: 'Bulk Processing', desc: 'Handle dozens of images at once without losing quality.' },
              { icon: FileArchive, title: 'Smart Export', desc: 'Download everything as a neatly organized ZIP archive.' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 flex items-center justify-center">
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
