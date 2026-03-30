import React, { useState, useCallback, useRef } from "react";
import { 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  ArrowLeft,
  Search,
  Files,
  Copy,
  Info,
  Download,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  exactHash: string;
  visualHash: string;
  size: number;
  dimensions: { width: number; height: number };
  status: 'processing' | 'ready' | 'error';
}

interface DuplicateGroup {
  hash: string;
  images: ImageFile[];
  type: 'exact' | 'visual';
}

export default function DuplicateImageFinder() {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate SHA-256 hash for exact duplicates
  const calculateExactHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper to calculate Difference Hash (dHash) for robust visual similarity
  const calculateVisualHash = async (file: File): Promise<{ hash: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Resize to 9x8 for dHash
        canvas.width = 9;
        canvas.height = 8;
        ctx.drawImage(img, 0, 0, 9, 8);

        const imageData = ctx.getImageData(0, 0, 9, 8);
        const data = imageData.data;
        
        let hash = '';
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const idx1 = (y * 9 + x) * 4;
            const idx2 = (y * 9 + (x + 1)) * 4;

            // Grayscale luminosity
            const gray1 = data[idx1] * 0.299 + data[idx1+1] * 0.587 + data[idx1+2] * 0.114;
            const gray2 = data[idx2] * 0.299 + data[idx2+1] * 0.587 + data[idx2+2] * 0.114;

            hash += gray1 > gray2 ? '1' : '0';
          }
        }

        resolve({ hash, width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setProgress(0);
    const newImages: ImageFile[] = [];
    const total = files.length;
    let processed = 0;

    const concurrency = 10;
    for (let i = 0; i < total; i += concurrency) {
      const chunk = Array.from(files).slice(i, i + concurrency);
      
      const chunkPromises = chunk.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          processed++;
          setProgress(Math.round((processed / total) * 100));
          return null;
        }

        try {
          const id = Math.random().toString(36).substring(7);
          const preview = URL.createObjectURL(file);
          const exactHash = await calculateExactHash(file);
          const { hash: visualHash, width, height } = await calculateVisualHash(file);
          
          processed++;
          setProgress(Math.round((processed / total) * 100));
          
          return {
            id,
            file,
            preview,
            exactHash,
            visualHash,
            size: file.size,
            dimensions: { width, height },
            status: 'ready' as const
          };
        } catch (error) {
          console.error('Error processing image:', error);
          processed++;
          setProgress(Math.round((processed / total) * 100));
          return null;
        }
      });

      const results = await Promise.all(chunkPromises);
      newImages.push(...(results.filter(Boolean) as ImageFile[]));
    }

    const allImages = [...images, ...newImages];
    setImages(allImages);
    findDuplicates(allImages);
    setIsProcessing(false);
  };

  const hammingDistance = (hash1: string, hash2: string) => {
    let dist = 0;
    for (let i = 0; i < 64; i++) {
      if (hash1[i] !== hash2[i]) dist++;
    }
    return dist;
  };

  const findDuplicates = (currentImages: ImageFile[]) => {
    const exactMap = new Map<string, ImageFile[]>();
    currentImages.forEach(img => {
      const list = exactMap.get(img.exactHash) || [];
      list.push(img);
      exactMap.set(img.exactHash, list);
    });

    const groups: DuplicateGroup[] = [];

    // 1. Exact Matches
    exactMap.forEach((imgs, hash) => {
      if (imgs.length > 1) {
        groups.push({ hash, images: imgs, type: 'exact' });
      }
    });

    // 2. Visual Matches (using dHash and Hamming distance)
    const visualVisited = new Set<string>();
    
    for (let i = 0; i < currentImages.length; i++) {
      const img1 = currentImages[i];
      if (visualVisited.has(img1.id)) continue;

      const vGroup = [img1];
      
      for (let j = i + 1; j < currentImages.length; j++) {
        const img2 = currentImages[j];
        if (visualVisited.has(img2.id)) continue;

        const dist = hammingDistance(img1.visualHash, img2.visualHash);
        if (dist <= 4) { // Threshold of 4 bits difference for visual similarity
          vGroup.push(img2);
        }
      }

      if (vGroup.length > 1) {
        // Check if this group is just an exact group we already found
        const isJustExactGroup = vGroup.every(vImg => vImg.exactHash === img1.exactHash);
        if (!isJustExactGroup) {
          groups.push({ hash: 'v-' + img1.id, images: vGroup, type: 'visual' });
          vGroup.forEach(img => visualVisited.add(img.id));
        }
      }
    }

    setDuplicateGroups(groups);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    const updated = images.filter(img => img.id !== id);
    setImages(updated);
    findDuplicates(updated);
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setDuplicateGroups([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                Duplicate Detector <Files className="w-8 h-8 text-indigo-600" />
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Detect visually similar images even with different names.
              </p>
            </div>
          </div>
          
          {images.length > 0 && (
            <button
              onClick={clearAll}
              className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> Clear All
            </button>
          )}
        </div>

        {/* Upload Area */}
        <div 
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer border-4 border-dashed rounded-[2.5rem] p-12 transition-all duration-500 ${
            dragActive 
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[0.99]" 
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400/50"
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept="image/*"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            className="hidden" 
          />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
              <Upload className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Drop your images here
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                Upload multiple images to find duplicates. We check both file content and visual similarity.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400">
                PNG, JPG, WebP
              </span>
              <span className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-sm font-bold text-indigo-600 dark:text-indigo-400">
                Visual AI Hashing
              </span>
            </div>
          </div>
        </div>

        {/* Processing State */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl shadow-indigo-500/20 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-lg font-bold">Analyzing images...</span>
                  </div>
                  <span className="text-lg font-black">{progress}%</span>
                </div>
                <div className="w-full bg-indigo-900/40 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                  <div 
                    className="bg-white h-full transition-all duration-300 ease-out rounded-full" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {images.length > 0 && (
          <div className="space-y-12">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total Images</div>
                <div className="text-4xl font-black text-slate-900 dark:text-white">{images.length}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Duplicate Groups</div>
                <div className="text-4xl font-black text-indigo-600">{duplicateGroups.length}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Potential Space Saving</div>
                <div className="text-4xl font-black text-emerald-600">
                  {formatSize(duplicateGroups.reduce((acc, group) => {
                    const groupSize = group.images.slice(1).reduce((s, img) => s + img.size, 0);
                    return acc + groupSize;
                  }, 0))}
                </div>
              </div>
            </div>

            {/* Duplicate Groups */}
            {duplicateGroups.length > 0 ? (
              <div className="space-y-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  Detected Duplicates <AlertCircle className="w-6 h-6 text-amber-500" />
                </h2>
                
                <div className="grid grid-cols-1 gap-8">
                  {duplicateGroups.map((group, gIdx) => (
                    <motion.div 
                      key={group.hash}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: gIdx * 0.1 }}
                      className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${group.type === 'exact' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                            {group.type === 'exact' ? <CheckCircle2 className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {group.type === 'exact' ? 'Exact Match' : 'Visually Similar'}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">{group.images.length} copies found</p>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Group #{gIdx + 1}
                        </div>
                      </div>

                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {group.images.map((img, iIdx) => (
                          <div key={img.id} className="relative group/item">
                            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <img 
                                src={img.preview} 
                                alt={img.file.name}
                                className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                              />
                            </div>
                            
                            <div className="mt-3 space-y-1">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={img.file.name}>
                                {img.file.name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                <span>{formatSize(img.size)}</span>
                                <span>{img.dimensions.width}x{img.dimensions.height}</span>
                              </div>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <button 
                                onClick={() => removeImage(img.id)}
                                className="p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-colors"
                                title="Remove from list"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {iIdx === 0 && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg uppercase tracking-widest">
                                Original
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800">
                <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No duplicates found!</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Your collection looks clean.</p>
              </div>
            )}

            {/* All Uploaded Images (Optional View) */}
            <div className="pt-12 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">All Uploaded Images ({images.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map(img => (
                  <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group relative">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(img.id)}
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/50 flex gap-6">
          <div className="shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Info className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">How it works</h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              We use two methods to detect duplicates: 
              <br />
              <strong>1. Exact Match:</strong> Uses SHA-256 hashing to find files that are bit-for-bit identical.
              <br />
              <strong>2. Visual Match:</strong> Uses a Difference Hashing (dHash) algorithm to find images that look the same even if they have been resized, renamed, or slightly compressed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
