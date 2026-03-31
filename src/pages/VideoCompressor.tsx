import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileVideo, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Video,
  Trash2,
  Settings2,
  Info,
  Play,
  Zap,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function VideoCompressor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressionStrength, setCompressionStrength] = useState(70); // 0-100
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(false);
  const loadAttemptedRef = useRef(false);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      loadFFmpeg();
    }
    
    // Cleanup object URL on unmount
    return () => {
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
      }
    };
  }, [compressedUrl]);

  const loadFFmpeg = async () => {
    try {
      const ffmpeg = ffmpegRef.current;
      if (ffmpeg.loaded || isFFmpegLoading) {
        setIsFFmpegLoaded(true);
        return;
      }

      setIsFFmpegLoading(true);
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
      
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setIsFFmpegLoaded(true);
      setIsFFmpegLoading(false);
    } catch (err) {
      console.error('FFmpeg Load Error:', err);
      setError('Failed to load video engine. Please refresh the page.');
      setIsFFmpegLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setOriginalSize(file.size);
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
      }
      setCompressedUrl(null);
      setCompressedSize(0);
      setError(null);
      setProgress(0);
    } else if (file) {
      setError('Please select a valid video file.');
    }
  };

  const compressVideo = async () => {
    if (!videoFile || !isFFmpegLoaded) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const ffmpeg = ffmpegRef.current;
      const inputName = 'input' + videoFile.name.substring(videoFile.name.lastIndexOf('.'));
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Map strength (0-100) to CRF (20-45)
      // 0 strength = CRF 20 (Very High Quality)
      // 100 strength = CRF 45 (Smallest Size)
      const crf = 20 + Math.round((compressionStrength / 100) * 25);

      const threads = navigator.hardwareConcurrency ? navigator.hardwareConcurrency.toString() : '4';
      
      // Prepare FFmpeg arguments for maximum speed and device utilization
      const args = [
        '-i', inputName,
        '-vcodec', 'libx264',
        '-crf', crf.toString(),
        '-preset', 'ultrafast', // Fastest encoding speed
        '-tune', 'fastdecode', // Optimize for fast decoding/encoding
        '-threads', threads, // Utilize all available CPU threads (puts more load on device)
        '-acodec', 'aac',
        '-b:a', '128k',
      ];

      // If compression strength is high, reduce resolution to save more space
      if (compressionStrength > 90) {
        args.push('-vf', 'scale=-2:480'); // Scale to 480p height
      } else if (compressionStrength > 70) {
        args.push('-vf', 'scale=-2:720'); // Scale to 720p height
      }

      // Add a bitrate cap to prevent size increase
      // We'll set a maxrate based on the compression strength
      // For 0% strength, we'll cap at a reasonable high bitrate
      // For 100% strength, we'll cap at a very low bitrate
      const maxBitrate = Math.max(500, 5000 - (compressionStrength * 45)); // 500k to 5000k
      args.push('-maxrate', `${maxBitrate}k`, '-bufsize', `${maxBitrate * 2}k`);

      // Add output name
      args.push(outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      setCompressedUrl(url);
      setCompressedSize(blob.size);
    } catch (err) {
      console.error('Compression Error:', err);
      setError('An error occurred during compression. Try a smaller file or lower strength.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!compressedUrl) return;
    const a = document.createElement('a');
    a.href = compressedUrl;
    a.download = `compressed_${videoFile?.name || 'video.mp4'}`;
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reset = () => {
    setVideoFile(null);
    setCompressedUrl(null);
    setCompressedSize(0);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-2"
          >
            <Zap className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Video <span className="text-blue-600">Compressor</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            Fast and private offline compression.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl">
          {!isFFmpegLoaded && !error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading video engine...</p>
            </div>
          )}

          {isFFmpegLoaded && !videoFile && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-all duration-300"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
              />
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors duration-300">
                  <FileVideo className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    Select Video File
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    MP4, MOV, AVI, and more
                  </p>
                </div>
              </div>
            </div>
          )}

          {videoFile && (
            <div className="space-y-8">
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Video className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                      {videoFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Original Size: {formatSize(originalSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={reset}
                  disabled={isProcessing}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Settings */}
              {!compressedUrl && !isProcessing && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-slate-900 dark:text-white text-lg">Compression Level</span>
                      </div>
                      <span className="text-blue-600 font-black text-xl">{compressionStrength}%</span>
                    </div>
                    
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={compressionStrength}
                      onChange={(e) => setCompressionStrength(parseInt(e.target.value))}
                      className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p>Higher percentage = smaller file size.</p>
                      <p className="font-bold flex items-center gap-1 mt-1">
                        <Sparkles className="w-3 h-3" />
                        Using Best Compression for high quality.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={compressVideo}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Start Compression
                  </button>
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <div className="space-y-6 py-8">
                  <div className="flex items-center justify-between text-lg font-black">
                    <span className="text-slate-900 dark:text-white">Processing Video...</span>
                    <span className="text-blue-600">{progress}%</span>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-slate-500 dark:text-slate-400 text-sm italic">
                    Please keep this tab open. This may take a few minutes depending on the file size.
                  </p>
                </div>
              )}

              {/* Result */}
              {compressedUrl && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Compression Complete!</p>
                      <p className="text-xs opacity-80">
                        New Size: {formatSize(compressedSize)} ({Math.round((1 - compressedSize / originalSize) * 100)}% reduction)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={downloadVideo}
                      className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </button>
                    <button
                      onClick={reset}
                      className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Compress Another
                    </button>
                  </div>

                  <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center shadow-2xl">
                    <video 
                      src={compressedUrl} 
                      controls 
                      className="w-full max-h-[70vh] object-contain"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
