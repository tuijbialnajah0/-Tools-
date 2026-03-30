import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  Download, 
  Settings, 
  Sliders, 
  Grid, 
  AlertCircle,
  Sun,
  Contrast as ContrastIcon,
  Moon,
  Zap,
  Smartphone,
  AlignJustify,
  Type,
  Maximize2
} from 'lucide-react';
import { ToolActivator } from '../components/ToolActivator';

interface EmojiColor {
  emoji: string;
  r: number;
  g: number;
  b: number;
}

type ArtMode = 'emoji' | 'braille' | 'ascii';

const EMOJI_COLORS: EmojiColor[] = [
  { emoji: '⬛', r: 0, g: 0, b: 0 },
  { emoji: '⬜', r: 255, g: 255, b: 255 },
  { emoji: '🟥', r: 255, g: 0, b: 0 },
  { emoji: '🟧', r: 255, g: 165, b: 0 },
  { emoji: '🟨', r: 255, g: 255, b: 0 },
  { emoji: '🟩', r: 0, g: 255, b: 0 },
  { emoji: '🟦', r: 0, g: 0, b: 255 },
  { emoji: '🟪', r: 128, g: 0, b: 128 },
  { emoji: '🟫', r: 139, g: 69, b: 19 },
  { emoji: '🏿', r: 60, g: 40, b: 30 },
  { emoji: '🏾', r: 130, g: 90, b: 70 },
  { emoji: '🏽', r: 190, g: 140, b: 110 },
  { emoji: '🏼', r: 230, g: 180, b: 150 },
  { emoji: '🏻', r: 250, g: 220, b: 200 },
];

export default function EmojiArtGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [emojiArt, setEmojiArt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [width, setWidth] = useState(11);
  const [mode, setMode] = useState<ArtMode>('emoji');
  const [copied, setCopied] = useState(false);
  const [contrast, setContrast] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);
  const [whatsappFix, setWhatsappFix] = useState(true);
  const [forceAlign, setForceAlign] = useState(false);
  const [vSquash, setVSquash] = useState(1.0);
  const [previewLineHeight, setPreviewLineHeight] = useState(1.0);
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark' | 'checkered'>('checkered');
  const [showOriginal, setShowOriginal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      generateArt(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [selectedFile, width, contrast, brightness, mode, invert, threshold, whatsappFix, forceAlign, vSquash]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setCopied(false);
    }
  };

  const findClosestEmoji = (r: number, g: number, b: number): string => {
    let minDistance = Infinity;
    let closestEmoji = EMOJI_COLORS[0].emoji;

    for (const color of EMOJI_COLORS) {
      const distance = Math.sqrt(
        Math.pow(r - color.r, 2) +
        Math.pow(g - color.g, 2) +
        Math.pow(b - color.b, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestEmoji = color.emoji;
      }
    }
    return closestEmoji;
  };

  const applyFilters = (r: number, g: number, b: number) => {
    // Apply brightness
    r *= brightness;
    g *= brightness;
    b *= brightness;

    // Apply contrast
    r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

    return {
      r: Math.min(255, Math.max(0, r)),
      g: Math.min(255, Math.max(0, g)),
      b: Math.min(255, Math.max(0, b)),
    };
  };

  const generateArt = (url: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (mode === 'emoji') {
        const aspectRatio = img.height / img.width;
        const height = Math.round(width * aspectRatio * (vSquash || 1.0));
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height).data;
        let art = '';

        for (let y = 0; y < height; y++) {
          // \u2800 is Braille Pattern Blank, often treated as a non-whitespace character by layout engines
          // This prevents WhatsApp from trimming leading spaces or collapsing lines
          if (whatsappFix) art += '\u2800'; 
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const filtered = applyFilters(imageData[i], imageData[i + 1], imageData[i + 2]);
            art += findClosestEmoji(filtered.r, filtered.g, filtered.b);
          }
          art += '\n';
        }
        setEmojiArt(art);
      } else if (mode === 'braille') {
        // Braille uses 2x4 blocks
        const targetWidth = width * 2;
        const aspectRatio = img.height / img.width;
        const targetHeight = Math.round(targetWidth * aspectRatio * vSquash);
        
        // Ensure height is multiple of 4
        const finalHeight = Math.ceil(targetHeight / 4) * 4;
        const finalWidth = Math.ceil(targetWidth / 2) * 2;

        canvas.width = finalWidth;
        canvas.height = finalHeight;
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight).data;
        let art = '';

        for (let y = 0; y < finalHeight; y += 4) {
          if (whatsappFix) art += '\u2800'; 
          for (let x = 0; x < finalWidth; x += 2) {
            let brailleCode = 0;
            const dots = [
              [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04],
              [1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20],
              [0, 3, 0x40], [1, 3, 0x80]
            ];

            for (const [dx, dy, bit] of dots) {
              const px = x + dx;
              const py = y + dy;
              if (px < finalWidth && py < finalHeight) {
                const i = (py * finalWidth + px) * 4;
                const r = imageData[i];
                const g = imageData[i+1];
                const b = imageData[i+2];
                const avg = (r + g + b) / 3;
                const filtered = applyFilters(avg, avg, avg);
                const isDark = filtered.r < threshold;
                
                if (invert ? !isDark : isDark) {
                  brailleCode |= bit;
                }
              }
            }
            // Force alignment fix: replace empty braille with a tiny dot if enabled
            if (forceAlign && brailleCode === 0) brailleCode = 0x01; // Add a single tiny dot
            
            const char = String.fromCharCode(0x2800 + brailleCode);
            art += char;
          }
          art += '\n';
        }
        setEmojiArt(art);
      } else if (mode === 'ascii') {
        const spaceChar = whatsappFix ? '\u2800' : ' ';
        const chars = invert ? `@%#*+=-:.${spaceChar}` : `${spaceChar}.:-=+*#%@`;
        const aspectRatio = img.height / img.width;
        const height = Math.round(width * aspectRatio * 0.5 * vSquash); // ASCII chars are tall
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height).data;
        let art = '';

        for (let y = 0; y < height; y++) {
          if (whatsappFix) art += '\u2800';
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = imageData[i];
            const g = imageData[i+1];
            const b = imageData[i+2];
            const avg = (r + g + b) / 3;
            const filtered = applyFilters(avg, avg, avg);
            const charIdx = Math.floor((filtered.r / 255) * (chars.length - 1));
            art += chars[charIdx];
          }
          art += '\n';
        }
        setEmojiArt(art);
      }

      setIsProcessing(false);
    };
  };

  const copyToClipboard = () => {
    let textToCopy = emojiArt;
    // Wrap in monospace backticks for WhatsApp if it's Braille or ASCII
    if (mode === 'braille' || mode === 'ascii') {
      textToCopy = '```\n' + emojiArt + '```';
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyWhatsAppSettings = () => {
    setWhatsappFix(true);
    if (mode === 'emoji') {
      setWidth(11);
      setVSquash(0.85);
    } else {
      setWidth(25);
      setVSquash(0.45);
    }
    if (previewUrl) generateArt(previewUrl);
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setEmojiArt('');
    setContrast(1);
    setBrightness(1);
    setThreshold(128);
    setWidth(11);
    setMode('emoji');
    setInvert(false);
  };

  const downloadAsImage = () => {
    if (!emojiArt) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = 20;
    const lines = emojiArt.split('\n').filter(line => line.length > 0);
    const charWidth = fontSize; // Emojis are roughly square
    const charHeight = fontSize;

    canvas.width = lines[0].length * charWidth / 2; // Emoji width is tricky, but this is a rough estimate
    // Actually, let's use a better way to measure
    ctx.font = `${fontSize}px serif`;
    const metrics = ctx.measureText('⬛');
    const actualCharWidth = metrics.width;
    
    canvas.width = lines[0].length * actualCharWidth;
    canvas.height = lines.length * fontSize;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${fontSize}px serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';

    lines.forEach((line, i) => {
      // Split line into individual emojis (handling surrogate pairs)
      const chars = Array.from(line as string);
      chars.forEach((char, j) => {
        ctx.fillText(char, j * actualCharWidth, i * fontSize);
      });
    });

    const link = document.createElement('a');
    link.download = 'emoji-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <ToolActivator name="Emoji Art" path="emoji-art" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
            >
              Emoji <span className="text-indigo-600">Art</span>
            </motion.h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Convert your photos into emoji pixel art (Optimized for WhatsApp mobile)
            </p>
          </div>
          
          {selectedFile && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={reset}
                className="p-3 bg-white dark:bg-slate-900 text-red-500 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shadow-sm"
                title="Reset"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={downloadAsImage}
                className="p-3 bg-white dark:bg-slate-900 text-indigo-600 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors shadow-sm"
                title="Download as Image"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Art'}
              </button>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          {/* Emoji Art Output / Preview Area */}
          <div className="w-full sticky top-0 lg:top-8 z-20">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden max-h-[70vh]">
              <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Preview Canvas</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {showOriginal ? 'Original Image' : 'Generated Art'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {/* Art vs Original Toggle */}
                  {selectedFile && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                      <button
                        onClick={() => setShowOriginal(false)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          !showOriginal
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Art
                      </button>
                      <button
                        onClick={() => setShowOriginal(true)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          showOriginal
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Original
                      </button>
                    </div>
                  )}

                  {!showOriginal && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mr-2">
                      <span className="text-[9px] font-bold text-slate-400 px-2 flex items-center">LINE HEIGHT</span>
                      <input 
                        type="range" 
                        min="0.8" 
                        max="2.0" 
                        step="0.1" 
                        value={previewLineHeight}
                        onChange={(e) => setPreviewLineHeight(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 self-center mr-2"
                      />
                      <span className="text-[9px] font-bold text-indigo-600 w-6">{previewLineHeight}</span>
                    </div>
                  )}

                  {!showOriginal && mode !== 'emoji' && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      {(['light', 'dark', 'checkered'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setCanvasTheme(t)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                            canvasTheme === t
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {t.charAt(0).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 lg:p-8 bg-slate-50/50 dark:bg-slate-950/50 overflow-auto flex items-center justify-center min-h-[300px]">
                {selectedFile ? (
                  showOriginal ? (
                    <div className="max-w-full max-h-full flex items-center justify-center p-4">
                      <img 
                        src={previewUrl!} 
                        alt="Original" 
                        className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : emojiArt ? (
                    <pre 
                      className={`font-mono leading-[1.1] whitespace-pre tracking-tighter select-all p-4 lg:p-8 rounded-3xl shadow-inner border transition-all ${
                        canvasTheme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-200' 
                          : canvasTheme === 'dark'
                            ? 'bg-slate-900 text-white border-slate-800'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800 bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")] bg-opacity-20'
                      }`}
                      style={{ 
                        lineHeight: previewLineHeight, 
                        fontSize: `${Math.max(6, 24 - (mode === 'emoji' ? width : width/3))}px` 
                      }}
                    >
                      {emojiArt}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                      <p className="text-slate-500 font-bold">Generating Art...</p>
                    </div>
                  )
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-md aspect-video bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group shadow-sm"
                  >
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">Upload Photo to Start</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Settings / Adjustments Area */}
          {selectedFile && (
            <div className="w-full">
              <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Adjustments</h3>
                  </div>
                  <div className="flex gap-1">
                    {(['emoji', 'braille', 'ascii'] as ArtMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMode(m);
                          if (m === 'emoji') {
                            setWidth(11);
                            setVSquash(1.0);
                          } else {
                            setWidth(25);
                            setVSquash(0.5);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                          mode === m
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {/* Toggles Row */}
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    {(mode === 'braille' || mode === 'ascii') && (
                      <button
                        onClick={() => setInvert(!invert)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                          invert 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Moon className="w-3 h-3" /> Invert
                      </button>
                    )}
                    <button
                      onClick={() => setWhatsappFix(!whatsappFix)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                        whatsappFix 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" /> WhatsApp Fix
                    </button>
                    {mode === 'braille' && (
                      <button
                        onClick={() => setForceAlign(!forceAlign)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                          forceAlign 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <AlignJustify className="w-3 h-3" /> Force Align
                      </button>
                    )}
                  </div>

                  {/* Resolution */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Grid className="w-3 h-3" /> Res
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">{width}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max={mode === 'emoji' ? 30 : 80}
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Height Adjustment */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Maximize2 className="w-3 h-3" /> Height
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setVSquash(mode === 'emoji' ? 1.0 : 0.5)}
                          className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500"
                        >
                          Orig
                        </button>
                        <button
                          onClick={() => setVSquash(mode === 'emoji' ? 0.85 : 0.45)}
                          className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600"
                        >
                          WA
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.5"
                      step="0.05"
                      value={vSquash}
                      onChange={(e) => setVSquash(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Sun className="w-3 h-3" /> Bright
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">{Math.round(brightness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={brightness}
                      onChange={(e) => setBrightness(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <ContrastIcon className="w-3 h-3" /> Contrast
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">{Math.round(contrast * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Threshold */}
                  {(mode === 'braille' || mode === 'ascii') && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                          <Zap className="w-3 h-3" /> Threshold
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600">{threshold}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}

                  {/* WhatsApp Tip */}
                  {mode === 'emoji' && (
                    <div className="md:col-span-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-indigo-600" />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                          Use <span className="font-bold text-indigo-600">Auto Fix</span> for perfect WhatsApp fit.
                        </p>
                      </div>
                      <button
                        onClick={applyWhatsAppSettings}
                        className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Auto Fix
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
