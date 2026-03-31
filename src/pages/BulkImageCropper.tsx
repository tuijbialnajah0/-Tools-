import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Upload, 
  Crop, 
  Download, 
  X, 
  Edit2, 
  Check, 
  Trash2, 
  Maximize2, 
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  Settings2,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import getCroppedImg from '../utils/cropImage';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  crop: Point;
  zoom: number;
  aspect: number;
  croppedAreaPixels: Area | null;
  isCropped: boolean;
}

const ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
];

// Memoized Image Card to prevent re-renders when other parts of the app update
const ImageCard = memo(({ 
  img, 
  globalAspect, 
  onEdit, 
  onRemove 
}: { 
  img: ImageFile, 
  globalAspect: number, 
  onEdit: (id: string) => void, 
  onRemove: (id: string) => void 
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all"
    >
      {/* Preview Container with Aspect Ratio */}
      <div 
        className="relative bg-slate-100 dark:bg-slate-800 overflow-hidden"
        style={{ aspectRatio: globalAspect }}
      >
        <img
          src={img.preview}
          alt="Preview"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {img.isCropped ? (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <Check className="w-3 h-3" />
              CUSTOM CROP
            </span>
          ) : (
            <span className="bg-slate-900/50 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
              <LayoutGrid className="w-3 h-3" />
              AUTO CENTER
            </span>
          )}
        </div>

        {/* Actions Overlay (Hidden by default, shown on hover for extra quick actions) */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-2xl shadow-2xl scale-90 group-hover:scale-100 transition-transform">
            <button
              onClick={() => onEdit(img.id)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-900 dark:text-white"
            >
              <Maximize2 className="w-4 h-4" />
              OPEN EDITOR
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1">{img.file.name}</p>
          <p className="text-[10px] text-slate-500">{(img.file.size / 1024).toFixed(1)} KB</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(img.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Edit2 className="w-3 h-3" />
            EDIT
          </button>
          <button
            onClick={() => onRemove(img.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// Separate Modal Component to isolate cropper state and prevent parent re-renders
const CropModal = ({ 
  image, 
  aspect, 
  onClose, 
  onSave 
}: { 
  image: ImageFile, 
  aspect: number, 
  onClose: () => void, 
  onSave: (crop: Point, zoom: number, pixels: Area) => void 
}) => {
  const [crop, setCrop] = useState<Point>(image.crop);
  const [zoom, setZoom] = useState(image.zoom);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(image.croppedAreaPixels);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-full"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Adjust Crop</h3>
            <p className="text-sm text-slate-500">Fine-tune the selection for {image.file.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="flex-1 relative min-h-[400px] bg-slate-100 dark:bg-slate-950">
          <Cropper
            image={image.preview}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Zoom Level
                </label>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={() => {
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className="flex-1 md:flex-none px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => croppedAreaPixels && onSave(crop, zoom, croppedAreaPixels)}
                className="flex-1 md:flex-none px-10 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                <Check className="w-5 h-5" />
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function BulkImageCropper() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [globalAspect, setGlobalAspect] = useState<number>(1);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      crop: { x: 0, y: 0 },
      zoom: 1,
      aspect: globalAspect,
      croppedAreaPixels: null,
      isCropped: false
    }));

    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const startEditing = useCallback((id: string) => {
    setEditingImageId(id);
  }, []);

  const saveCrop = useCallback((crop: Point, zoom: number, croppedAreaPixels: Area) => {
    if (!editingImageId) return;

    setImages(prev => prev.map(img => {
      if (img.id === editingImageId) {
        return {
          ...img,
          crop,
          zoom,
          croppedAreaPixels,
          isCropped: true
        };
      }
      return img;
    }));
    setEditingImageId(null);
  }, [editingImageId]);

  const updateGlobalAspect = (aspect: number) => {
    setGlobalAspect(aspect);
    setImages(prev => prev.map(img => ({
      ...img,
      aspect,
      isCropped: false, // Reset individual crops when global aspect changes
      croppedAreaPixels: null
    })));
  };

  const downloadAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    const zip = new JSZip();
    const total = images.length;

    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let blob: Blob | null;

        if (img.croppedAreaPixels) {
          blob = await getCroppedImg(img.preview, img.croppedAreaPixels);
        } else {
          // Auto crop to center if not manually cropped
          // This is a bit complex to do "auto" without a library, 
          // but we can simulate a center crop by calculating the area
          const imageElement = new Image();
          imageElement.src = img.preview;
          await new Promise(resolve => imageElement.onload = resolve);

          const { width, height } = imageElement;
          const targetAspect = globalAspect;
          let cropWidth, cropHeight, x, y;

          if (width / height > targetAspect) {
            cropHeight = height;
            cropWidth = height * targetAspect;
            x = (width - cropWidth) / 2;
            y = 0;
          } else {
            cropWidth = width;
            cropHeight = width / targetAspect;
            x = 0;
            y = (height - cropHeight) / 2;
          }

          blob = await getCroppedImg(img.preview, { x, y, width: cropWidth, height: cropHeight });
        }

        if (blob) {
          zip.file(`cropped_${i + 1}.jpg`, blob);
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `cropped_images_${Date.now()}.zip`);
    } catch (error) {
      console.error('Error during bulk crop:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const editingImage = images.find(i => i.id === editingImageId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-6 text-indigo-600 dark:text-indigo-400"
          >
            <Crop className="w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight"
          >
            Bulk Image <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Cropper</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-400 font-medium"
          >
            Crop multiple images at once with precise control. 
            Select your ratio, adjust each image, and download them all in a single ZIP.
          </motion.p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Select Aspect Ratio
              </label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.label}
                    onClick={() => updateGlobalAspect(ratio.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      globalAspect === ratio.value
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 md:flex-none px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Images
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
              />
              
              {images.length > 0 && (
                <button
                  onClick={downloadAll}
                  disabled={isProcessing}
                  className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {progress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download ZIP
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 gap-6">
          <AnimatePresence>
            {images.map((img) => (
              <ImageCard
                key={img.id}
                img={img}
                globalAspect={globalAspect}
                onEdit={startEditing}
                onRemove={removeImage}
              />
            ))}
          </AnimatePresence>

          {images.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="w-12 h-12 opacity-20" />
              </div>
              <p className="text-xl font-bold">No images uploaded yet</p>
              <p className="text-sm mt-2">Upload multiple images to start bulk cropping</p>
            </div>
          )}
        </div>
      </div>

      {/* Editing Modal */}
      <AnimatePresence>
        {editingImageId && editingImage && (
          <CropModal
            image={editingImage}
            aspect={globalAspect}
            onClose={() => setEditingImageId(null)}
            onSave={saveCrop}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
