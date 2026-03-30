import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Play, 
  Trash2, 
  Settings2, 
  Layers, 
  Zap, 
  Info, 
  AlertCircle,
  VolumeX,
  LayoutGrid
} from 'lucide-react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function YouTubeMultiView() {
  const [videoUrl, setVideoUrl] = useState('');
  const [viewCount, setViewCount] = useState(10);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [apiReady, setApiReady] = useState(false);
  const playersRef = useRef<any[]>([]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };
  }, []);

  const extractVideoId = (url: string) => {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);

  const handleStart = () => {
    const id = extractVideoId(videoUrl);
    if (!id) {
      setError('Please enter a valid YouTube URL.');
      return;
    }
    if (!apiReady) {
      setError('YouTube API is still loading. Please wait a moment.');
      return;
    }
    setError(null);
    setIsStarted(true);
  };

  const handleReset = () => {
    // Destroy all players
    playersRef.current.forEach(player => {
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    });
    playersRef.current = [];
    setIsStarted(false);
    setVideoUrl('');
    setViewCount(10);
  };

  // Initialize players when started
  useEffect(() => {
    if (isStarted && videoId && apiReady) {
      const timer = setTimeout(() => {
        const newPlayers: any[] = [];
        for (let i = 0; i < viewCount; i++) {
          const playerElementId = `player-${i}`;
          const player = new window.YT.Player(playerElementId, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              mute: isMuted ? 1 : 0,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              origin: window.location.origin,
              playlist: videoId,
              loop: 1,
              vq: 'tiny'
            },
            events: {
              onReady: (event: any) => {
                if (isMuted) event.target.mute();
                event.target.playVideo();
                // Attempt to set lowest quality
                if (event.target.setPlaybackQuality) {
                  event.target.setPlaybackQuality('small');
                }
              },
              onError: (event: any) => {
                console.error(`Player ${i} error:`, event.data);
              }
            }
          });
          newPlayers.push(player);
        }
        playersRef.current = newPlayers;
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isStarted, videoId, apiReady, viewCount, isMuted]);

  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-xl shadow-red-500/20 mb-2"
          >
            <Youtube className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Multi <span className="text-red-600">Viewer Pro</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            Play one video in multiple instances using official YouTube IFrame API. Optimized for maximum reliability.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl">
          {!isStarted ? (
            <div className="space-y-8 max-w-2xl mx-auto">
              {/* URL Input */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                  <Youtube className="w-4 h-4 text-red-600" />
                  YouTube Video URL
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste YouTube link here..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-red-500/50 focus:ring-0 transition-all outline-none text-slate-900 dark:text-white"
                  />
                </div>
                {videoId && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    {thumbnailUrl && (
                      <img 
                        src={thumbnailUrl} 
                        alt="Preview" 
                        className="w-20 h-12 rounded-lg object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Video ID Detected</p>
                      <p className="text-sm font-mono text-red-600 font-bold">{videoId}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* View Count Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    <Layers className="w-4 h-4 text-red-600" />
                    Number of Views
                  </label>
                  <span className="text-red-600 font-black text-xl">{viewCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={viewCount}
                  onChange={(e) => setViewCount(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>1 View</span>
                  <span>50 Views</span>
                  <span>100 Views</span>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all border-2 ${
                    isMuted 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 text-red-600' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <VolumeX className="w-5 h-5" />
                  {isMuted ? 'Muted (Recommended)' : 'Unmuted'}
                </button>
                <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-100 dark:border-blue-900/50 text-blue-600 rounded-2xl font-bold">
                  <Zap className="w-5 h-5" />
                  API Mode (Official)
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={!apiReady}
                className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                  apiReady 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6 fill-current" />
                {apiReady ? 'START MULTI-VIEW' : 'LOADING API...'}
              </button>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex gap-3">
                <Info className="w-5 h-5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Now using the official YouTube IFrame Player API. This method is more reliable for autoplay and view counting. We still force the lowest quality to save bandwidth.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Active API Sessions: {viewCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mode: Official IFrame API</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Stop All
                </button>
              </div>

              {/* Grid of Player Placeholders */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: viewCount }).map((_, index) => (
                  <div 
                    key={`player-container-${index}`} 
                    className="aspect-video rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-sm relative group"
                  >
                    <div id={`player-${index}`} className="w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
