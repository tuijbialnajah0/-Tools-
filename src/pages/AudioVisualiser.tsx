import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Image as ImageIcon, 
  Play, 
  Square, 
  Smartphone, 
  Monitor, 
  Circle, 
  Activity,
  Download,
  Settings,
  RefreshCw,
  Video
} from 'lucide-react';
import { ToolActivator } from '../components/ToolActivator';

type AspectRatio = '1:1' | '9:16' | '16:9';
type WaveStyle = 'line' | 'circular';

export default function AudioVisualiser() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [waveStyle, setWaveStyle] = useState<WaveStyle>('circular');
  const [waveColor, setWaveColor] = useState('#4f46e5'); // Indigo-600
  const [bgColor, setBgColor] = useState('#0f172a'); // Slate-900
  
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Canvas dimensions based on aspect ratio
  const getDimensions = () => {
    switch (aspectRatio) {
      case '1:1': return { width: 720, height: 720 };
      case '9:16': return { width: 720, height: 1280 };
      case '16:9': return { width: 1280, height: 720 };
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setVideoUrl(null);
      setProgress(0);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgImage(URL.createObjectURL(file));
    }
  };

  // Preview drawing (static)
  useEffect(() => {
    if (isRecording) return; // Don't interfere if recording
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getDimensions();
    canvas.width = width;
    canvas.height = height;

    // Draw Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      const img = new Image();
      img.src = bgImage;
      img.onload = () => {
        // Cover logic
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        drawStaticWave(ctx, width, height);
      };
    } else {
      drawStaticWave(ctx, width, height);
    }
  }, [aspectRatio, waveStyle, waveColor, bgColor, bgImage, isRecording]);

  const drawStaticWave = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = waveColor;
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 4;

    // Fake data for preview
    const fakeData = Array.from({ length: 64 }, () => Math.random() * 100 + 50);

    if (waveStyle === 'circular') {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) * 0.4;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
      ctx.fill(); // Inner circle

      for (let i = 0; i < fakeData.length; i++) {
        const amplitude = fakeData[i];
        const angle = (i / fakeData.length) * Math.PI * 2;
        const barHeight = amplitude * 0.8;
        
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else {
      const barWidth = (width / fakeData.length) * 0.8;
      const spacing = (width / fakeData.length) * 0.2;
      let x = 0;
      
      for (let i = 0; i < fakeData.length; i++) {
        const barHeight = fakeData[i] * 1.5;
        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + spacing;
      }
    }
  };

  const generateVideo = async () => {
    if (!audioUrl || !canvasRef.current) return;

    setIsRecording(true);
    setProgress(0);
    setVideoUrl(null);

    let isCurrentlyRecording = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = getDimensions();
    canvas.width = width;
    canvas.height = height;

    // Setup Audio
    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    activeAudioRef.current = audio;
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioCtx;
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const dest = audioCtx.createMediaStreamDestination();
    
    source.connect(analyser);
    analyser.connect(audioCtx.destination); // To hear it while recording
    analyser.connect(dest); // To record it

    // Setup Canvas Stream
    const canvasStream = canvas.captureStream(30); // 30 FPS
    
    // Combine Audio and Video Streams
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    const chunks: BlobPart[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
      ? 'video/webm;codecs=vp9,opus' 
      : 'video/webm;codecs=vp8,opus';
      
    const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      isCurrentlyRecording = false;
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      setProgress(100);
      
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };

    // Pre-load background image if exists
    let bgImgObj: HTMLImageElement | null = null;
    if (bgImage) {
      bgImgObj = new Image();
      bgImgObj.src = bgImage;
      await new Promise((resolve) => {
        bgImgObj!.onload = resolve;
        bgImgObj!.onerror = resolve;
      });
    }

    // Drawing Loop
    const draw = () => {
      if (!isCurrentlyRecording) return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Draw Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      if (bgImgObj) {
        const scale = Math.max(width / bgImgObj.width, height / bgImgObj.height);
        const x = (width / 2) - (bgImgObj.width / 2) * scale;
        const y = (height / 2) - (bgImgObj.height / 2) * scale;
        ctx.drawImage(bgImgObj, x, y, bgImgObj.width * scale, bgImgObj.height * scale);
      }

      // Draw Wave
      ctx.fillStyle = waveColor;
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      if (waveStyle === 'circular') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.4;
        
        // Inner circle pulsing to beat
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10 + (average * 0.2), 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < bufferLength; i++) {
          const amplitude = dataArray[i];
          const angle = (i / bufferLength) * Math.PI * 2;
          const barHeight = (amplitude / 255) * (radius * 0.8);
          
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else {
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height * 0.4);
          const finalHeight = Math.max(barHeight, 4); // Ensure minimum height
          ctx.fillRect(x, height / 2 - finalHeight / 2, barWidth - 2, finalHeight);
          x += barWidth;
        }
      }

      // Update progress
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    // Start everything
    audio.onended = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    mediaRecorder.start();
    audio.play().catch(e => console.error("Audio play error:", e));
    draw();
  };

  const stopRecordingEarly = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (activeAudioRef.current) activeAudioRef.current.pause();
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <ToolActivator name="Audio Visualiser" path="audio-visualiser" />
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
          >
            Audio <span className="text-indigo-600">Visualiser</span>
          </motion.h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Convert MP3 to animated sound wave videos for social media.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              
              {/* File Uploads */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-500" /> Audio File (MP3/WAV)
                </h3>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Music className="w-6 h-6 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {audioFile ? audioFile.name : 'Click to upload audio'}
                    </p>
                  </div>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} disabled={isRecording} />
                </label>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-6">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> Background Image (Optional)
                </h3>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {bgImage ? 'Image Selected (Click to change)' : 'Click to upload background'}
                    </p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isRecording} />
                </label>
                {bgImage && (
                  <button 
                    onClick={() => setBgImage(null)}
                    className="text-[10px] text-red-500 font-bold hover:underline"
                    disabled={isRecording}
                  >
                    Remove Image
                  </button>
                )}
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Settings */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-500" /> Visual Settings
                </h3>
                
                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1:1', icon: Square, label: 'Square' },
                      { id: '9:16', icon: Smartphone, label: 'Portrait' },
                      { id: '16:9', icon: Monitor, label: 'Landscape' }
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                        disabled={isRecording}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${
                          aspectRatio === ratio.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ratio.icon className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{ratio.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wave Style */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Wave Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'line', icon: Activity, label: 'Line Wave' },
                      { id: 'circular', icon: Circle, label: 'Circular' }
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setWaveStyle(style.id as WaveStyle)}
                        disabled={isRecording}
                        className={`flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
                          waveStyle === style.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <style.icon className="w-4 h-4" />
                        <span className="text-xs font-bold">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Wave Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={waveColor} 
                        onChange={(e) => setWaveColor(e.target.value)}
                        disabled={isRecording}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400 uppercase">{waveColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Background</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={isRecording || !!bgImage}
                        className={`w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent ${bgImage ? 'opacity-50' : ''}`}
                      />
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400 uppercase">{bgColor}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Preview & Render Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
              
              {!videoUrl ? (
                <div className="w-full flex flex-col items-center">
                  {/* Canvas Preview Container */}
                  <div className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950 mb-6 flex items-center justify-center ${
                    aspectRatio === '1:1' ? 'w-[300px] h-[300px]' :
                    aspectRatio === '9:16' ? 'w-[225px] h-[400px]' :
                    'w-[400px] h-[225px]'
                  }`}>
                    <canvas 
                      ref={canvasRef} 
                      className="w-full h-full object-contain"
                    />
                    
                    {isRecording && (
                      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Recording</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {isRecording ? (
                    <div className="w-full max-w-md space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>Generating Video...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <button 
                        onClick={stopRecordingEarly}
                        className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                      >
                        Stop & Save Early
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateVideo}
                      disabled={!audioUrl}
                      className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/30 transform active:scale-95"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Generate Video
                    </button>
                  )}
                  
                  {!audioUrl && !isRecording && (
                    <p className="text-xs text-slate-400 mt-4 font-medium">
                      Upload an audio file to start generating
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                    <Video className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Video Ready!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center max-w-sm">
                    Your audio visualizer has been successfully generated and is ready to download.
                  </p>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => setVideoUrl(null)}
                      className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Create Another
                    </button>
                    <a
                      href={videoUrl}
                      download="audio-visualiser.webm"
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/30"
                    >
                      <Download className="w-4 h-4" /> Download Video
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4">Format: WebM (Supported by most modern platforms)</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
