import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, Upload, X, CheckCircle2, AlertCircle, Download, MessageCircle, Video, Plus, Crop } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { executeTool } from "../lib/toolService";
import JSZip from "jszip";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const MAX_VIDEOS = 10;
const HARD_LIMIT_KB = 500;
const TARGET_FRAMES = 60; // Increased from 30 for better smoothness
const MIN_FRAMES = 30;

interface VideoSticker {
  id: string;
  file: File;
  preview: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  resultBlob?: Blob;
  resultSize?: number;
}

export function WhatsappSCreateVideo() {
  const { user, updateUser } = useAuth();
  const [videos, setVideos] = useState<VideoSticker[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolId, setToolId] = useState<number | null>(null);
  const [baseCost, setBaseCost] = useState<number>(350);
  const [packName, setPackName] = useState("My Animated Pack");
  const [baseLength, setBaseLength] = useState<number>(8);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Crop state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropRatio, setCropRatio] = useState<number>(1); // 1:1 default, 0 for custom/original
  
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (videos.length > 0 && step === 1) {
      setStep(2);
    } else if (videos.length === 0 && step === 2) {
      setStep(1);
    }
  }, [videos.length]);

  useEffect(() => {
    const fetchToolData = async () => {
      try {
        const toolsRef = collection(db, "tools");
        const q = query(
          toolsRef, 
          where("enabled", "==", true)
        );
        const querySnapshot = await getDocs(q);
        
        const toolDoc = querySnapshot.docs.find(doc => {
          const name = doc.data().tool_name || "";
          return name.toLowerCase().includes("whatsapp-s-create video");
        });
          
        if (toolDoc) {
          setToolId(toolDoc.id as any);
          const data = toolDoc.data();
          if (data.credit_cost !== undefined) {
            setBaseCost(data.credit_cost);
          }
        }
      } catch (err) {
        console.error("Error fetching tool data:", err);
      }
    };
    fetchToolData();
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      videos.forEach(v => URL.revokeObjectURL(v.preview));
    };
  }, []);

  useEffect(() => {
    setVideos(prev => prev.map(v => ({
      ...v,
      error: v.duration > baseLength ? `Will be trimmed to ${baseLength}s` : undefined
    })));
  }, [baseLength]);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    
    setProcessingStatus("Loading engine...");
    const ffmpeg = new FFmpeg();
    
    // Add logging
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg Log:', message);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (err) {
      console.error("FFmpeg load error:", err);
      throw new Error("Failed to load processing engine. Please try again.");
    }
  };

  const validateAndAddFiles = (files: File[]) => {
    setError(null);
    const validFiles = files.filter(f => f.type.startsWith('video/') || f.type === 'image/gif');
    
    if (validFiles.length === 0) {
      setError("Please select valid video files or GIFs.");
      return;
    }

    if (videos.length + validFiles.length > MAX_VIDEOS) {
      setError(`Maximum ${MAX_VIDEOS} stickers per pack.`);
      return;
    }

    validFiles.forEach(file => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        const newVideo: VideoSticker = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: URL.createObjectURL(file),
          duration,
          status: 'pending',
          error: duration > baseLength ? `Will be trimmed to ${baseLength}s` : undefined
        };
        
        setVideos(prev => [...prev, newVideo]);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const removeVideo = (id: string) => {
    setVideos(prev => {
      const filtered = prev.filter(v => v.id !== id);
      const removed = prev.find(v => v.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const processVideos = async () => {
    if (!user || !toolId) return;
    if (user.credit_balance < baseCost) {
      setError("Insufficient credits.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setResultUrl(null);

    try {
      const ffmpeg = await loadFFmpeg();
      const zip = new JSZip();
      
      // Hardcoded Author as requested
      const authorName = "ͲႮᏆᎫᏴᏆᎪᏞΝΑᎫΑᎻ·Kҽɳƈԋσ Aʅιαɳƈҽ";
      zip.file("author.txt", authorName);
      zip.file("title.txt", packName);

      // Generate tray icon from the first video
      if (videos.length > 0) {
        setProcessingStatus("Generating tray icon...");
        const firstVideo = videos[0];
        const trayInput = `tray_input_${firstVideo.id}`;
        const trayOutput = "tray.png";
        await ffmpeg.writeFile(trayInput, await fetchFile(firstVideo.file));
        await ffmpeg.exec([
          '-i', trayInput,
          '-vframes', '1',
          '-vf', "scale=96:96:force_original_aspect_ratio=increase,crop=96:96",
          trayOutput
        ]);
        const trayData = await ffmpeg.readFile(trayOutput);
        zip.file("tray.png", new Blob([trayData], { type: 'image/png' }));
      }

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        setProcessingStatus(`Processing sticker ${i + 1}/${videos.length}...`);
        setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'processing' } : v));

        const inputName = `input_${video.id}`;
        const outputName = `output_${video.id}.webp`;
        
        await ffmpeg.writeFile(inputName, await fetchFile(video.file));

        // Calculate actual duration to process (max baseLength)
        const actualDuration = Math.min(baseLength, video.duration);
        
        // Calculate target FPS to get TARGET_FRAMES
        const targetFps = Math.min(30, TARGET_FRAMES / actualDuration);

        // Compression loop
        let success = false;
        let quality = 50; // Start lower to accommodate more frames
        let resultBlob: Blob | null = null;

        while (quality >= 5 && !success) {
          const cropFilter = cropRatio > 0 
            ? `,crop='if(gt(ih*${cropRatio},iw),iw,ih*${cropRatio})':'if(gt(ih*${cropRatio},iw),iw/${cropRatio},ih)':(iw-ow)/2:(ih-oh)/2`
            : '';

          await ffmpeg.exec([
            '-i', inputName,
            '-t', actualDuration.toString(),
            '-vf', `fps=${targetFps}${cropFilter},scale=512:512:force_original_aspect_ratio=increase,crop=512:512`,
            '-vframes', TARGET_FRAMES.toString(),
            '-loop', '0',
            '-c:v', 'libwebp',
            '-lossless', '0',
            '-q:v', quality.toString(),
            '-preset', 'picture',
            '-an',
            outputName
          ]);

          const data = await ffmpeg.readFile(outputName);
          const sizeKb = (data as Uint8Array).length / 1024;

          if (sizeKb <= HARD_LIMIT_KB) {
            resultBlob = new Blob([data], { type: 'image/webp' });
            success = true;
          } else {
            quality -= 10;
            setProcessingStatus(`Compressing sticker ${i + 1} (Quality: ${quality})...`);
          }
        }

        if (success && resultBlob) {
          zip.file(`${i + 1}.webp`, resultBlob);
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'completed', resultBlob: resultBlob!, resultSize: resultBlob!.size } : v));
        } else {
          throw new Error(`Failed to compress sticker ${i + 1} under 500KB even at lowest quality.`);
        }

        setProgress(Math.round(((i + 1) / videos.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const customBlob = new Blob([content], { type: "application/octet-stream" });
      const url = URL.createObjectURL(customBlob);
      setResultUrl(url);
      setStep(3);

      // Deduct credits
      const success = await executeTool(user.id, toolId?.toString() || "whatsapp-s-create-video", baseCost);
      
      if (!success) {
        throw new Error("Failed to deduct credits. Please check your balance.");
      }

      updateUser({ 
        credit_balance: user.credit_balance - baseCost,
        total_spent: (user.total_spent || 0) + baseCost
      });

      setProcessingStatus("Pack ready!");
    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err.message || "An error occurred during processing.");
      setVideos(prev => prev.map(v => v.status === 'processing' ? { ...v, status: 'error', error: 'Failed' } : v));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            <Video className="w-8 h-8 mr-3 text-indigo-600" />
            Whatsapp-S-Create Video
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Convert video clips into animated WhatsApp sticker packs.
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Cost: {baseCost} Credits</span>
        </div>
      </div>

      {/* Hidden file input for both steps */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*,image/gif"
        multiple
        className="hidden"
      />

      {step === 1 && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              validateAndAddFiles(Array.from(e.dataTransfer.files));
            }}
            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-all bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none"
          >
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Upload Video Clips</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              Drag and drop your videos here, or click to browse. Max 10 seconds per clip.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none transform hover:scale-105 active:scale-95"
            >
              Select Videos
            </button>
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Supported Formats</p>
              <div className="flex justify-center gap-4 mt-3">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">MP4</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">MOV</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">GIF</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">WEBM</span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Selected Clips</h3>
                  <p className="text-sm text-slate-500">{videos.length} of {MAX_VIDEOS} slots used</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowCropModal(true)}
                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold flex items-center hover:bg-indigo-100 transition-colors"
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Auto Crop
                  </button>
                  <button 
                    onClick={() => { setVideos([]); setStep(1); }}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <div key={video.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <video 
                      src={video.preview} 
                      className="w-full h-full object-cover"
                      muted
                      loop
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => e.currentTarget.pause()}
                    />
                    <button
                      onClick={() => removeVideo(video.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {video.status === 'processing' && (
                      <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {video.status === 'completed' && (
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-md">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    {video.error && (
                      <div className="absolute inset-0 bg-red-500/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center">
                        <AlertCircle className="w-8 h-8 text-white mb-2" />
                        <span className="text-xs text-white font-bold leading-tight">{video.error}</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-black tracking-wider">
                      {video.duration.toFixed(1)}s
                    </div>
                  </div>
                ))}
                {videos.length < MAX_VIDEOS && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Add More</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-indigo-600" />
                Pack Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Pack Name
                  </label>
                  <input
                    type="text"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    placeholder="Enter pack name..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                    Author: ͲႮᏆᎫᏴᏆᎪᏞΝΑᎫΑΗ·Kҽɳƈԋσ Aʅιαɳƈҽ
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Sticker Length
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[4, 6, 8].map((len) => (
                      <button
                        key={len}
                        onClick={() => setBaseLength(len)}
                        className={`py-3 px-3 rounded-2xl border-2 text-sm font-black transition-all ${
                          baseLength === len
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-105"
                            : "bg-white border-slate-100 text-slate-600 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {len}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                    WhatsApp Specs
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400 font-medium">
                    <li className="flex items-center"><div className="w-1 h-1 bg-indigo-400 rounded-full mr-2" /> Format: Animated WebP</li>
                    <li className="flex items-center"><div className="w-1 h-1 bg-indigo-400 rounded-full mr-2" /> Resolution: 512x512px</li>
                    <li className="flex items-center"><div className="w-1 h-1 bg-indigo-400 rounded-full mr-2" /> Max Size: 500 KB</li>
                    <li className="flex items-center"><div className="w-1 h-1 bg-indigo-400 rounded-full mr-2" /> Frames: Up to 60</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={processVideos}
                disabled={isProcessing || videos.length === 0}
                className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl transition-all flex items-center justify-center transform active:scale-95 ${
                  isProcessing || videos.length === 0
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="animate-pulse">{processingStatus}</span>
                  </>
                ) : (
                  <>
                    <Video className="w-6 h-6 mr-3" />
                    Generate Pack
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto p-8 md:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Pack Created!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Your animated sticker pack is ready. Download it and open with any sticker maker app.
          </p>
          
          <div className="flex flex-col gap-4 justify-center max-w-md mx-auto mb-8">
            {resultUrl && (
              <a
                href={resultUrl}
                download={`${packName.replace(/\s+/g, '_')}.wastickers`}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center transform hover:scale-[1.02] active:scale-95"
              >
                <Download className="w-6 h-6 mr-3" />
                Download Pack
              </a>
            )}
            
            <button
              onClick={() => {
                setVideos([]);
                setResultUrl(null);
                setStep(1);
              }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Create Another Pack
            </button>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <Crop className="w-6 h-6 mr-2 text-indigo-600" />
                Auto Crop
              </h3>
              <button onClick={() => setShowCropModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium">
              Choose a crop ratio that will be applied to all video clips in this pack.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: 'Original', value: 0 },
                { label: '1:1 Square', value: 1 },
                { label: '4:5 Portrait', value: 0.8 },
                { label: '16:9 Wide', value: 1.77 },
                { label: '9:16 Story', value: 0.56 },
                { label: '3:4 Classic', value: 0.75 },
              ].map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => setCropRatio(ratio.value)}
                  className={`px-4 py-4 rounded-2xl border-2 font-bold transition-all text-sm ${
                    cropRatio === ratio.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 scale-105'
                      : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCropModal(false)}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none transform active:scale-95"
            >
              Apply to All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
