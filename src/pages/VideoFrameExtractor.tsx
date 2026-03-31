import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { 
  Upload, Film, Settings, Download, CheckCircle2, 
  X, Image as ImageIcon, Loader2, AlertCircle, Trash2,
  CheckSquare, Square
} from 'lucide-react';

interface ExtractedFrame {
  id: string;
  name: string;
  url: string;
  selected: boolean;
  blob: Blob;
}

export default function VideoFrameExtractor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const framesPerPage = 24; // Smaller page size for smoother UI

  // Settings
  const [fps, setFps] = useState<string>('1'); // Frames per second
  const [resolution, setResolution] = useState<string>('480'); // Height in pixels

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup blob URLs on unmount
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      frames.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, [videoPreviewUrl, frames]);

  useEffect(() => {
    setCurrentPage(1);
  }, [frames.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(URL.createObjectURL(file));
      
      // Clear previous frames
      frames.forEach(f => URL.revokeObjectURL(f.url));
      setFrames([]);
      setError(null);
      setProgress(0);
    } else if (file) {
      setError('Please select a valid video file.');
    }
  };

  const extractFrames = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setStatusMessage('Preparing video for extraction...');
    
    // Clear old frames
    frames.forEach(f => URL.revokeObjectURL(f.url));
    setFrames([]);

    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(videoFile);

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('Failed to load video metadata'));
      });

      const duration = video.duration;
      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;

      if (!duration || !originalWidth || !originalHeight) {
        throw new Error("Invalid video file.");
      }

      let targetHeight = originalHeight;
      let targetWidth = originalWidth;

      if (resolution !== 'original') {
        targetHeight = parseInt(resolution);
        targetWidth = Math.floor(originalWidth * (targetHeight / originalHeight));
      }

      let canvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(targetWidth, targetHeight);
        ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      } else {
        canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      }

      if (!ctx) throw new Error("Failed to get canvas context");

      const fpsNum = parseFloat(fps);
      const totalFrames = Math.floor(duration * fpsNum) + 1;
      let extractedFramesCount = 0;

      setStatusMessage('Extracting frames...');

      const isMobile = window.innerWidth < 768;
      const maxFrames = isMobile ? 1000 : 5000;
      const yieldBatchSize = isMobile ? 10 : 30;
      let lastProgress = -1;
      let currentBatch: ExtractedFrame[] = [];

      for (let i = 0; i < totalFrames; i++) {
        // Yield to main thread periodically to prevent UI freeze
        if (i > 0 && i % yieldBatchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
          
          // Update UI with current batch
          if (currentBatch.length > 0) {
            setFrames(prev => [...prev, ...currentBatch]);
            currentBatch = [];
          }
        }

        const time = i / fpsNum;
        if (time > duration) break;
        
        // Use a more efficient seeking approach
        video.currentTime = time;

        await new Promise((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(true);
          };
          video.addEventListener('seeked', onSeeked);
          
          // Shorter timeout for faster recovery
          setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            resolve(false);
          }, 300);
        });

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        const blob = await new Promise<Blob | null>((resolve) => {
          if ('convertToBlob' in canvas) {
            (canvas as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality: 0.6 })
              .then(resolve)
              .catch(() => resolve(null));
          } else {
            (canvas as HTMLCanvasElement).toBlob(resolve, 'image/jpeg', 0.6);
          }
        });

        if (blob) {
          const paddedNum = String(i + 1).padStart(4, '0');
          const fileName = `frame_${paddedNum}.jpg`;
          currentBatch.push({
            id: fileName,
            name: fileName,
            url: URL.createObjectURL(blob),
            selected: true,
            blob: blob
          });
          extractedFramesCount++;
        }

        const currentProgress = Math.round(((i + 1) / totalFrames) * 100);
        if (currentProgress !== lastProgress) {
          setProgress(currentProgress);
          setStatusMessage(`Extracting frames (${currentProgress}%)...`);
          lastProgress = currentProgress;
        }

        // Hard limit to prevent browser crash
        if (extractedFramesCount >= maxFrames) {
          setStatusMessage(`Reached maximum frame limit (${maxFrames}).`);
          break;
        }
      }

      // Add final batch
      if (currentBatch.length > 0) {
        setFrames(prev => [...prev, ...currentBatch]);
      }

      URL.revokeObjectURL(video.src);

      if (extractedFramesCount === 0) {
        throw new Error("No frames were extracted. Try a different video or settings.");
      }

      setStatusMessage('');
      setProgress(100);
    } catch (err: any) {
      console.error('Extraction Error:', err);
      setError(err.message || 'An error occurred during extraction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFrameSelection = (id: string) => {
    setFrames(frames.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const selectAll = () => setFrames(frames.map(f => ({ ...f, selected: true })));
  const deselectAll = () => setFrames(frames.map(f => ({ ...f, selected: false })));
  const invertSelection = () => setFrames(frames.map(f => ({ ...f, selected: !f.selected })));

  const downloadZip = async () => {
    const selectedFrames = frames.filter(f => f.selected);
    if (selectedFrames.length === 0) return;

    setIsZipping(true);
    setStatusMessage('Generating ZIP file...');

    // Yield to let UI update before heavy zipping
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const zip = new JSZip();
      
      selectedFrames.forEach((frame, index) => {
        // Rename sequentially based on selection to avoid gaps
        const paddedNum = String(index + 1).padStart(4, '0');
        zip.file(`frame_${paddedNum}.jpg`, frame.blob);
      });

      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'STORE' // Faster, images are already compressed
      });
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extracted_frames_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP Error:', err);
      setError('Failed to create ZIP file.');
    } finally {
      setIsZipping(false);
      setStatusMessage('');
    }
  };

  const selectedCount = frames.filter(f => f.selected).length;
  const totalPages = Math.ceil(frames.length / framesPerPage);
  const paginatedFrames = frames.slice((currentPage - 1) * framesPerPage, currentPage * framesPerPage);

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
            <Film className="w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight"
          >
            Video Frame <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Extractor</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-400 font-medium"
          >
            Extract high-quality image sequences from any video. 
            Process runs entirely offline in your browser for maximum privacy.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Input Video
              </h2>
              
              {!videoFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Click to browse</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">MP4, WebM, MOV</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                    <video 
                      src={videoPreviewUrl!} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{videoFile.name}</p>
                      <p className="text-xs text-slate-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={() => {
                        setVideoFile(null);
                        setFrames([]);
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="video/*" 
                className="hidden" 
              />
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                Extraction Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Frames Per Second (FPS)
                  </label>
                    <select 
                      value={fps}
                      onChange={(e) => setFps(e.target.value)}
                      disabled={isProcessing}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                    >
                      <option value="0.0033333333333333335">1 frame every 5 minutes</option>
                      <option value="0.008333333333333333">1 frame every 2 minutes</option>
                      <option value="0.016666666666666666">1 frame every 60 seconds</option>
                      <option value="0.03333333333333333">1 frame every 30 seconds</option>
                      <option value="0.1">1 frame every 10 seconds</option>
                      <option value="0.2">1 frame every 5 seconds</option>
                      <option value="0.5">1 frame every 2 seconds</option>
                      <option value="1">1 FPS (1 frame every second)</option>
                      <option value="2">2 FPS</option>
                      <option value="5">5 FPS</option>
                      <option value="10">10 FPS</option>
                      <option value="24">24 FPS (Cinematic)</option>
                      <option value="30">30 FPS (Standard)</option>
                    </select>
                  <p className="text-xs text-slate-500 mt-2">Higher FPS = More images = Slower processing</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Resolution (Height)
                  </label>
                  <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                  >
                    <option value="360">360p (Fastest)</option>
                    <option value="480">480p (Recommended)</option>
                    <option value="720">720p (HD)</option>
                    <option value="1080">1080p (FHD - High Memory)</option>
                    <option value="original">Original (May crash browser)</option>
                  </select>
                </div>

                <button
                  onClick={extractFrames}
                  disabled={!videoFile || isProcessing}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Extract Frames
                    </>
                  )}
                </button>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm font-medium flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[600px] flex flex-col">
              
              {/* Header / Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Extracted Frames
                    {frames.length > 0 && (
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs py-1 px-2.5 rounded-full">
                        {frames.length} total
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {frames.length > 0 
                      ? "Select the frames you want to keep and download them as a ZIP." 
                      : "Frames will appear here after extraction."}
                  </p>
                </div>

                {frames.length > 0 && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl shrink-0">
                    <button onClick={selectAll} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all" title="Select All">
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button onClick={deselectAll} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all" title="Deselect All">
                      <Square className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    <button onClick={invertSelection} className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">
                      Invert
                    </button>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 relative">
                {isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 relative mb-8">
                      <svg className="animate-spin w-full h-full text-indigo-200 dark:text-indigo-900/50" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" />
                      </svg>
                      <svg className="animate-spin w-full h-full text-indigo-600 absolute top-0 left-0" viewBox="0 0 100 100" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}>
                        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" strokeDasharray={`${progress * 2.8} 280`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{progress}%</span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300 animate-pulse">{statusMessage}</p>
                  </div>
                ) : frames.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar mb-4">
                      {paginatedFrames.map((frame) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={frame.id}
                          onClick={() => toggleFrameSelection(frame.id)}
                          className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                            frame.selected 
                              ? 'border-indigo-500 shadow-md shadow-indigo-500/20' 
                              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <img 
                            src={frame.url} 
                            alt={frame.name} 
                            className="w-full aspect-video object-cover bg-slate-100 dark:bg-slate-800"
                            loading="lazy"
                          />
                          
                          {/* Overlay */}
                          <div className={`absolute inset-0 transition-opacity ${frame.selected ? 'bg-indigo-500/20' : 'bg-black/0 group-hover:bg-black/10'}`} />
                          
                          {/* Checkbox */}
                          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            frame.selected ? 'bg-indigo-500 text-white scale-100' : 'bg-white/80 text-slate-400 scale-0 group-hover:scale-100'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          
                          {/* Label */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                            <p className="text-[10px] font-mono text-white/90 truncate">{frame.name}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 px-4">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-medium">No frames extracted yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Action Bar for Download */}
      <AnimatePresence>
        {frames.length > 0 && selectedCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 inset-x-0 z-50 flex justify-center px-4"
          >
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-full shadow-2xl flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs font-bold opacity-70 uppercase tracking-wider">Selected</span>
                <span className="text-lg font-black">{selectedCount} <span className="text-sm font-medium opacity-70">frames</span></span>
              </div>
              
              <div className="w-px h-8 bg-white/20 dark:bg-black/20" />
              
              <button
                onClick={downloadZip}
                disabled={isZipping}
                className="bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-black flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Zipping...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download ZIP
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
