import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Film, 
  Loader2, 
  Download, 
  Settings, 
  Trash2, 
  FileArchive, 
  FileText, 
  AlertCircle,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

export default function VideoStoryboard() {
  const [file, setFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<{ id: string; url: string; blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(0.15); // 0.05 (lots) to 0.5 (few)
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(false);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadAttemptedRef = useRef(false);
  const durationRef = useRef<number>(0);

  useEffect(() => {
    if (!loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      loadFFmpeg();
    }
  }, []);

  const loadFFmpeg = async () => {
    try {
      const ffmpeg = ffmpegRef.current;
      if (ffmpeg.loaded || isFFmpegLoading) {
        setIsFFmpegLoaded(true);
        return;
      }

      setIsFFmpegLoading(true);
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
      
      ffmpeg.on('progress', ({ progress, time }) => {
        if (time && durationRef.current > 0) {
          // time is in microseconds, duration is in seconds
          const percent = (time / 1000000) / durationRef.current * 100;
          setProgress(Math.min(100, Math.max(0, Math.round(percent))));
        } else if (progress) {
          setProgress(Math.round(progress * 100));
        }
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
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setFrames([]);
        setError(null);
        setProgress(0);
      } else {
        setError('Please select a valid video file.');
      }
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const extractFrames = async () => {
    if (!file || !isFFmpegLoaded) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setFrames([]);

    try {
      const duration = await getVideoDuration(file);
      durationRef.current = duration;
      
      const ffmpeg = ffmpegRef.current;
      const inputName = 'input_video.mp4';
      
      // Write file to FFmpeg FS
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Add log listener for progress tracking
      const logHandler = ({ message }: { message: string }) => {
        // FFmpeg logs time in format: time=00:00:00.00
        const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (timeMatch && duration > 0) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const percent = Math.min(99, Math.round((currentTime / duration) * 100));
          setProgress(percent);
        }
      };
      ffmpeg.on('log', logHandler);

      // Run FFmpeg command for scene detection
      // We scale down to max 640px on the longest side to prevent WASM Out-Of-Memory errors
      // -vf "select='gt(scene,0.4)'" extracts frames where scene change is > 40%
      // -vsync vfr ensures we only get the selected frames, not duplicates
      // -q:v 5 ensures good quality JPEG while saving memory
      try {
        await ffmpeg.exec([
          '-i', inputName,
          '-vf', `scale=640:640:force_original_aspect_ratio=decrease,select='gt(scene,${sensitivity})'`,
          '-vsync', 'vfr',
          '-q:v', '5',
          'frame_%04d.jpg'
        ]);
      } finally {
        ffmpeg.off('log', logHandler);
      }

      setProgress(100);

      // Read generated files
      const fileList = await ffmpeg.listDir('/');
      const frameFiles = fileList.filter(f => f.name.startsWith('frame_') && f.name.endsWith('.jpg'));
      
      if (frameFiles.length === 0) {
        setError('No scene changes detected. Try lowering the sensitivity.');
        setIsProcessing(false);
        return;
      }

      const extractedFrames = [];
      for (const frameFile of frameFiles) {
        const data = await ffmpeg.readFile(frameFile.name);
        const blob = new Blob([data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        extractedFrames.push({
          id: frameFile.name,
          url,
          blob
        });
        
        // Clean up FFmpeg FS to save memory
        await ffmpeg.deleteFile(frameFile.name);
      }

      // Clean up input video
      await ffmpeg.deleteFile(inputName);

      setFrames(extractedFrames);
    } catch (err) {
      console.error('Extraction error:', err);
      setError('Memory limit exceeded or extraction failed. Try a shorter video.');
    } finally {
      // Clean up input video to free memory even if it fails
      try {
        await ffmpegRef.current.deleteFile('input_video.mp4');
      } catch (e) {
        // Ignore cleanup errors
      }
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const removeFrame = (idToRemove: string) => {
    setFrames(prev => {
      const frame = prev.find(f => f.id === idToRemove);
      if (frame) URL.revokeObjectURL(frame.url);
      return prev.filter(f => f.id !== idToRemove);
    });
  };

  const downloadZip = async () => {
    if (frames.length === 0) return;
    
    const zip = new JSZip();
    frames.forEach((frame, index) => {
      // Format index like 001, 002, etc.
      const num = (index + 1).toString().padStart(3, '0');
      zip.file(`scene_${num}.jpg`, frame.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'cinematic_storyboard_frames.zip');
  };

  const downloadPdf = async () => {
    if (frames.length === 0) return;

    // A4 size: 210 x 297 mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    
    // Grid settings (3x3)
    const cols = 3;
    const rows = 3;
    const framesPerPage = cols * rows;
    
    const cellWidth = (pageWidth - (margin * 2) - (margin * (cols - 1))) / cols;
    // Assuming 16:9 aspect ratio for frames
    const cellHeight = cellWidth * (9 / 16);

    // Title page
    pdf.setFontSize(24);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Cinematic Storyboard', pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${frames.length} Unique Scenes Extracted`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

    // Helper function to read blob as base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    };

    for (let i = 0; i < frames.length; i++) {
      if (i % framesPerPage === 0) {
        pdf.addPage();
        // Add header
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Cinematic Storyboard', margin, margin - 5);
        pdf.text(`Page ${Math.floor(i / framesPerPage) + 1}`, pageWidth - margin, margin - 5, { align: 'right' });
      }

      const pageIndex = i % framesPerPage;
      const col = pageIndex % cols;
      const row = Math.floor(pageIndex / cols);

      const x = margin + (col * (cellWidth + margin));
      const y = margin + (row * (cellHeight + margin + 10)); // +10 for text space

      const base64Img = await blobToBase64(frames[i].blob);
      
      // Draw image
      pdf.addImage(base64Img, 'JPEG', x, y, cellWidth, cellHeight);
      
      // Draw frame number
      pdf.setFontSize(8);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Scene ${i + 1}`, x, y + cellHeight + 5);
    }

    pdf.save('cinematic_storyboard.pdf');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Video Storyboard & Frame Extractor
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Automatically detect scene changes and extract unique frames from your video. 
          Perfect for creating storyboards, contact sheets, and thumbnails.
        </p>
      </div>

      {!isFFmpegLoaded ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          {error ? (
            <div className="flex flex-col items-center text-red-500">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="font-medium">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          ) : (
            <>
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Loading Video Engine...</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              {/* Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Video
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${file ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/*"
                    className="hidden"
                  />
                  {file ? (
                    <div className="space-y-2">
                      <Film className="w-8 h-8 text-indigo-600 mx-auto" />
                      <p className="text-sm font-medium text-indigo-900 truncate px-4">
                        {file.name}
                      </p>
                      <p className="text-xs text-indigo-700">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium text-gray-900">
                        Click to upload video
                      </p>
                      <p className="text-xs text-gray-500">
                        MP4, WebM, MOV up to 500MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Scene Detection Sensitivity
                  </label>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-md text-gray-600">
                    {sensitivity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>More Frames (0.05)</span>
                  <span>Fewer Frames (0.5)</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-3">
                <button
                  onClick={extractFrames}
                  disabled={!file || isProcessing}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all relative overflow-hidden
                    ${!file || isProcessing 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-[0.98]'}`}
                >
                  {isProcessing && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-indigo-500/30 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-2">
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting ({progress}%)...
                      </>
                    ) : (
                      <>
                        <Film className="w-5 h-5" />
                        Extract Unique Scenes
                      </>
                    )}
                  </div>
                </button>
                
                {isProcessing && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Gallery & Export */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  Extracted Frames
                  {frames.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs py-1 px-2 rounded-full">
                      {frames.length}
                    </span>
                  )}
                </h2>

                {frames.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={downloadZip}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Download ZIP"
                    >
                      <FileArchive className="w-5 h-5" />
                    </button>
                    <button
                      onClick={downloadPdf}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Download PDF Storyboard"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {frames.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <ImageIcon className="w-16 h-16 opacity-20" />
                  <p>Upload a video and extract frames to see them here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4 max-h-[600px]">
                  <AnimatePresence>
                    {frames.map((frame, index) => (
                      <motion.div
                        key={frame.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img 
                          src={frame.url} 
                          alt={`Scene ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => removeFrame(frame.id)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors transform hover:scale-110"
                            title="Remove frame"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                          Scene {index + 1}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {frames.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <button
                    onClick={downloadZip}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                  >
                    <FileArchive className="w-5 h-5" />
                    Download ZIP
                  </button>
                  <button
                    onClick={downloadPdf}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <FileText className="w-5 h-5" />
                    Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
