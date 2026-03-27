import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Palette, Copy, RefreshCw, Image as ImageIcon, Check, Download } from 'lucide-react';

export default function ColorPalette() {
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a random color palette on mount
  useEffect(() => {
    generateRandomPalette();
  }, []);

  const generateRandomPalette = () => {
    setImage(null);
    const newPalette = Array.from({ length: 6 }, () => {
      const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      return `#${hex.toUpperCase()}`;
    });
    setPalette(newPalette);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      setImage(imgUrl);
      
      const img = new Image();
      img.onload = () => {
        extractColors(img);
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  };

  const extractColors = (imgElement: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // Scale down for performance
    const MAX_DIM = 200;
    let width = imgElement.width;
    let height = imgElement.height;
    
    if (width > height) {
      if (width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imgElement, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const colorCounts: Record<string, number> = {};
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];
      
      if (a < 128) continue; // Skip mostly transparent pixels
      
      // Quantize by rounding to nearest 16 to group similar colors
      const quantR = Math.round(r / 16) * 16;
      const quantG = Math.round(g / 16) * 16;
      const quantB = Math.round(b / 16) * 16;
      
      const rgb = `${quantR},${quantG},${quantB}`;
      colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
    }
    
    // Sort by frequency
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([rgb]) => rgb.split(',').map(Number));
      
    // Filter similar colors to get a diverse palette
    const extractedPalette: number[][] = [];
    const MIN_DISTANCE = 60; // Minimum RGB distance between colors
    
    for (const color of sortedColors) {
      if (extractedPalette.length >= 6) break;
      
      let isSimilar = false;
      for (const pColor of extractedPalette) {
        const dist = Math.sqrt(
          Math.pow(color[0] - pColor[0], 2) + 
          Math.pow(color[1] - pColor[1], 2) + 
          Math.pow(color[2] - pColor[2], 2)
        );
        if (dist < MIN_DISTANCE) {
          isSimilar = true;
          break;
        }
      }
      
      if (!isSimilar) {
        extractedPalette.push(color);
      }
    }
    
    // Convert to hex
    const hexPalette = extractedPalette.map(c => {
      // Ensure values are within 0-255
      const r = Math.min(255, Math.max(0, c[0]));
      const g = Math.min(255, Math.max(0, c[1]));
      const b = Math.min(255, Math.max(0, c[2]));
      const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
      return `#${hex}`;
    });

    // If we couldn't find enough distinct colors, fill the rest with random colors
    while (hexPalette.length < 6) {
      const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      hexPalette.push(`#${hex.toUpperCase()}`);
    }

    setPalette(hexPalette);
    setIsProcessing(false);
  };

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Calculate text color (black or white) based on background color brightness
  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  };

  const downloadPalette = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions for a beautiful layout
    canvas.width = 1200;
    canvas.height = 800;

    // Fill background
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add title
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Color Palette', canvas.width / 2, 120);

    // Calculate dimensions for swatches
    const padding = 80;
    const gap = 24;
    const totalGapWidth = gap * (palette.length - 1);
    const swatchWidth = (canvas.width - (padding * 2) - totalGapWidth) / palette.length;
    const swatchHeight = 450;
    const startY = 200;

    // Draw swatches
    palette.forEach((color, index) => {
      const startX = padding + (swatchWidth + gap) * index;
      
      // Draw color rectangle with rounded corners
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(startX, startY, swatchWidth, swatchHeight, 24);
      ctx.fill();

      // Draw HEX text below
      ctx.fillStyle = '#475569'; // slate-600
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(color, startX + swatchWidth / 2, startY + swatchHeight + 60);
    });

    // Add footer
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText('Generated with AI Studio', canvas.width / 2, canvas.height - 40);

    // Trigger download
    const link = document.createElement('a');
    link.download = 'color-palette.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3">
          <Palette className="w-10 h-10 text-indigo-500" />
          Color Palette Generator
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Extract beautiful color palettes from your images or generate random ones.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls & Image Upload */}
        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-colors ${
              image ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {image ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800">
                  <img src={image} alt="Uploaded" className="w-full h-full object-contain" />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Another Image
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center py-8">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Extract from Image
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Drag & drop or click
                  </p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span className="text-sm font-medium text-slate-400">OR</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          <button 
            onClick={generateRandomPalette}
            className="w-full px-6 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 dark:shadow-white/10"
          >
            <RefreshCw className="w-5 h-5" />
            Generate Random Palette
          </button>
        </div>

        {/* Right Column: Palette Display */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-full shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {image ? 'Extracted Palette' : 'Generated Palette'}
              </h3>
              
              {!isProcessing && palette.length > 0 && (
                <button
                  onClick={downloadPalette}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Image
                </button>
              )}
            </div>
            
            {isProcessing ? (
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 min-h-[300px]">
                {palette.map((color, index) => (
                  <motion.div
                    key={`${color}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    style={{ backgroundColor: color }}
                    onClick={() => copyToClipboard(color)}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                      {copiedColor === color ? (
                        <div className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-bold shadow-lg">
                          <Check className="w-4 h-4 text-green-600" />
                          Copied!
                        </div>
                      ) : (
                        <div className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-bold shadow-lg">
                          <Copy className="w-4 h-4" />
                          Copy HEX
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-end bg-gradient-to-t from-black/40 to-transparent">
                      <span 
                        className="font-mono font-bold text-sm tracking-wider"
                        style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        {color}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
