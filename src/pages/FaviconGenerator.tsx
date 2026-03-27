import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileArchive, X, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ProcessedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

const FAVICON_SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

export function FaviconGenerator() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: ProcessedImage[] = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const resizeImage = (img: HTMLImageElement, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Draw image to fill the square
      ctx.drawImage(img, 0, 0, size, size);
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Blob generation failed'));
      }, 'image/png');
    });
  };

  const generateFavicons = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    const zip = new JSZip();

    for (let i = 0; i < images.length; i++) {
      const imgData = images[i];
      
      setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, status: 'processing' } : img));

      try {
        const imgElement = new Image();
        imgElement.src = imgData.preview;
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
        });

        const folderName = imgData.file.name.replace(/\.[^/.]+$/, "");
        const folder = images.length > 1 ? zip.folder(folderName) : zip;

        if (folder) {
          for (const sizeInfo of FAVICON_SIZES) {
            const blob = await resizeImage(imgElement, sizeInfo.size);
            folder.file(sizeInfo.name, blob);
            
            // Also save 32x32 as favicon.ico
            if (sizeInfo.size === 32) {
              folder.file('favicon.ico', blob);
            }
          }
        }

        setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, status: 'done' } : img));
      } catch (error) {
        console.error('Error processing image:', error);
        setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, status: 'error' } : img));
      }
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'favicons.zip');
    } catch (error) {
      console.error('Error generating ZIP:', error);
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-4">
            <ImageIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Favicon
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg">
            Generate perfect favicon sets for your websites. Select multiple images and download them all in a ZIP.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
          <div 
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 sm:p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Select Images
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Click to browse or drag and drop multiple images here
            </p>
          </div>

          <AnimatePresence>
            {images.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Selected Images ({images.length})
                  </h4>
                  <button
                    onClick={() => setImages([])}
                    className="text-sm text-rose-500 hover:text-rose-600 font-medium"
                    disabled={isProcessing}
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <img 
                        src={img.preview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Status Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {!isProcessing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors transform hover:scale-110"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Processing Status */}
                      {img.status !== 'pending' && (
                        <div className="absolute top-2 right-2">
                          {img.status === 'processing' && (
                            <div className="p-1.5 bg-indigo-500 text-white rounded-full shadow-lg animate-spin">
                              <Loader2 className="w-3 h-3" />
                            </div>
                          )}
                          {img.status === 'done' && (
                            <div className="p-1.5 bg-emerald-500 text-white rounded-full shadow-lg">
                              <CheckCircle className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={generateFavicons}
                    disabled={isProcessing || images.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileArchive className="w-5 h-5" />
                        Download ZIP
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
