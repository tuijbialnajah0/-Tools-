import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { 
  Image as ImageIcon, 
  Upload, 
  Download, 
  Settings, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageCompressor() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maxSizeMB, setMaxSizeMB] = useState<number>(1);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState<number>(1920);
  const [initialQuality, setInitialQuality] = useState<number>(0.8);
  const [preserveExif, setPreserveExif] = useState<boolean>(false);
  const [outputType, setOutputType] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedImage, setCompressedImage] = useState<File | null>(null);
  const [compressedPreview, setCompressedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      setImageFile(file);
      setCompressedImage(null);
      setCompressedPreview(null);
      setError(null);
      
      // Default output type to input type if it's common, else jpeg
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setOutputType(file.type);
      } else {
        setOutputType('image/jpeg');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handleCompress = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const options = {
        maxSizeMB: maxSizeMB,
        maxWidthOrHeight: maxWidthOrHeight,
        useWebWorker: true,
        initialQuality: initialQuality,
        preserveExif: preserveExif,
        fileType: outputType,
      };

      const compressedFile = await imageCompression(imageFile, options);
      setCompressedImage(compressedFile);
      
      const preview = await imageCompression.getDataUrlFromFile(compressedFile);
      setCompressedPreview(preview);
    } catch (err: any) {
      console.error('Compression error:', err);
      setError('An error occurred during compression. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateReduction = () => {
    if (!imageFile || !compressedImage) return 0;
    const reduction = ((imageFile.size - compressedImage.size) / imageFile.size) * 100;
    return Math.max(0, Math.round(reduction));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">IMAGE COMPRESSOR</h1>
            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">100% Private & Offline</p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center space-x-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Upload & Settings */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                <Upload className="w-4 h-4 text-orange-500" />
                <span>Upload Image</span>
              </h2>
              
              <label className="relative group cursor-pointer block">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${imageFile ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-orange-400'}`}>
                  {imageFile ? (
                    <>
                      <FileImage className="w-12 h-12 text-orange-500 mb-3" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white text-center truncate w-full px-4">{imageFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatSize(imageFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Click to upload image</p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP supported</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-orange-500" />
                  <span>Compression Settings</span>
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
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Preserve Metadata</span>
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

                <button
                  onClick={handleCompress}
                  disabled={!imageFile || isProcessing}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                    !imageFile || isProcessing
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.98]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compressing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Compress Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-full flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                <Maximize2 className="w-4 h-4 text-orange-500" />
                <span>Preview</span>
              </h2>

              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[300px]">
                {compressedPreview ? (
                  <img 
                    src={compressedPreview} 
                    alt="Compressed"
                    className="w-full h-full object-contain"
                  />
                ) : imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Original"
                    className="w-full h-full object-contain opacity-50"
                  />
                ) : (
                  <div className="text-center p-8">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs text-slate-400">No image selected</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                    <p className="text-white text-center font-bold text-sm">Processing...</p>
                  </div>
                )}
              </div>

              {compressedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-800 dark:text-green-200">
                        Reduced by {calculateReduction()}%
                      </p>
                      <p className="text-[10px] text-green-600 dark:text-green-400">
                        {formatSize(imageFile!.size)} → {formatSize(compressedImage.size)}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={compressedPreview!} 
                    download={`compressed_${imageFile?.name || 'image.jpg'}`}
                    className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors shadow-lg shadow-green-500/20"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-orange-800 dark:text-orange-200 flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4" />
            <span>How it works</span>
          </h3>
          <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
            This tool uses <strong>browser-image-compression</strong> to process your images directly in your browser. 
            Your images are <strong>never uploaded to any server</strong>. 
            The compression happens entirely on your device, making it 100% private and secure.
            Supported formats: JPG, PNG, WebP, BMP, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
