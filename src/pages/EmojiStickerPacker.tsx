import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smile, Package, Info, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import JSZip from 'jszip';
import { ToolActivator } from '../components/ToolActivator';
import PokemonStickerPacker from './PokemonStickerPacker';

export default function EmojiStickerPacker() {
  const [mode, setMode] = useState<'emoji' | 'pokemon'>('emoji');
  const [packName, setPackName] = useState('My Awesome Emojis');
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [petals, setPetals] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate random petals
    const newPetals = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 10}s`,
      size: `${10 + Math.random() * 20}px`
    }));
    setPetals(newPetals);
  }, []);
  
  const AUTHOR_NAME = 'ͲႮᏆᎫᏴᏆᎪᏞΝᎪᎫᎪᎻ·Kҽɳƈԋσ Aʅʅιαɳƈҽ';
  const MAX_EMOJIS = 30;

  const COMMON_EMOJIS = [
    // Faces & People
    '1f600', '1f602', '1f60d', '1f60e', '1f60f', '1f618', '1f621', '1f62d', '1f631', '1f633',
    '1f921', '1f92a', '1f92c', '1f92d', '1f92e', '1f92f', '1f973', '1f974', '1f975', '1f976',
    // Animals & Nature
    '1f431', '1f436', '1f430', '1f43c', '1f42f', '1f43b', '1f435', '1f412', '1f415', '1f408',
    '1f981', '1f984', '1f98b', '1f33a', '1f33b', '1f335', '1f340', '1f341', '1f342', '1f343',
    // Food & Drink
    '1f34e', '1f353', '1f349', '1f34c', '1f354', '1f355', '1f35f', '1f363', '1f366', '1f369',
    '1f36a', '1f370', '1f37a', '1f377', '1f378', '1f379', '1f37b', '1f382', '1f388', '1f389',
    // Activities & Objects
    '1f3ae', '1f3b8', '1f3b1', '1f3c0', '1f3d3', '1f4bb', '1f4f1', '1f4f7', '1f4f8', '1f4fa',
    '1f525', '1f4a9', '1f480', '1f47b', '1f47d', '1f4a3', '1f4a4', '1f4a2', '1f440', '1f445',
    // Symbols & More
    '1f44d', '1f44e', '1f44c', '1f4af', '1f496', '1f49d', '1f49f', '1f4a1', '1f4a6', '1f4a8'
  ];

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (selectedEmojis.length >= MAX_EMOJIS) {
      setStatusMessage(`You can only select up to ${MAX_EMOJIS} emojis per pack.`);
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    
    // Use the unified code to ensure consistency
    if (!selectedEmojis.includes(emojiData.unified)) {
      setSelectedEmojis([...selectedEmojis, emojiData.unified]);
    }
  };

  const removeEmoji = (unified: string) => {
    setSelectedEmojis(selectedEmojis.filter(e => e !== unified));
  };

  const clearAll = () => {
    setSelectedEmojis([]);
  };

  const randomizeEmojis = () => {
    // Pick exactly 30 unique emojis from the common list
    const shuffled = [...COMMON_EMOJIS].sort(() => 0.5 - Math.random());
    setSelectedEmojis(shuffled.slice(0, 30));
    setStatusMessage('Random 30 emojis generated!');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  // Helper to convert unified hex to actual emoji character
  const unifiedToChar = (unified: string) => {
    return unified.split('-').map(hex => String.fromCodePoint(parseInt(hex, 16))).join('');
  };

  // Helper to get Apple Emoji URL for high quality rendering (WhatsApp style)
  const getAppleEmojiUrl = (unified: string, size: 64 | 160 = 64) => {
    // Strip variation selector if present (common issue with some emoji sets)
    const cleanUnified = unified.split('-').filter(part => part !== 'fe0f').join('-').toLowerCase();
    // Use a more modern and reliable CDN for Apple emojis (WhatsApp style)
    // 160px is not always available on all CDNs, falling back to 64px if needed for the picker
    const baseUrl = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/${size === 160 ? '160' : '64'}`;
    // Note: Some CDNs might not have 160px, so we might need to stick to 64px or use a different source for 160px
    // Let's use iamcal for 160px as it's known to have them, and official for 64px
    if (size === 160) {
      return `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160/${cleanUnified}.png`;
    }
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${cleanUnified}.png`;
  };

  const generateStickerPack = async () => {
    if (selectedEmojis.length < 3) {
      setStatusMessage('WhatsApp requires at least 3 emojis per pack.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    if (!packName.trim()) {
      setStatusMessage('Please enter a pack name.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Preparing your sticker pack...');

    try {
      const zip = new JSZip();
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get 2D context");

      // WhatsApp sticker requirements: 512x512, webp format
      canvas.width = 512;
      canvas.height = 512;

      const webpBlobs: Blob[] = [];

      // 1. Process each emoji into a 512x512 WebP image
      for (let i = 0; i < selectedEmojis.length; i++) {
        const unified = selectedEmojis[i];
        setStatusMessage(`Processing emoji ${i + 1} of ${selectedEmojis.length}...`);
        setProgress(((i) / (selectedEmojis.length + 1)) * 100);

        // Clear canvas
        ctx.clearRect(0, 0, 512, 512);

        try {
          // Try to load high-quality Twemoji image
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = getAppleEmojiUrl(unified, 160); // Use high-res for actual sticker
          });

          // Draw image centered and scaled up to 512x512
          // Leave a small margin (e.g., 16px) as per WhatsApp guidelines
          const margin = 32;
          ctx.drawImage(img, margin, margin, 512 - (margin * 2), 512 - (margin * 2));

        } catch (err) {
          // Fallback: Draw text emoji if image fails to load
          console.warn(`Failed to load image for ${unified}, falling back to text rendering.`);
          ctx.font = '400px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unifiedToChar(unified), 256, 280); // Slight vertical offset adjustment
        }

        // Convert canvas to WebP Blob
        const blob = await new Promise<Blob | null>(resolve => {
          // WhatsApp requires stickers to be < 100KB. 0.7 quality is safer for complex emojis.
          canvas.toBlob(resolve, 'image/webp', 0.7); 
        });

        if (blob) {
          webpBlobs.push(blob);
        }
      }

      setStatusMessage('Creating pack metadata...');
      setProgress(90);

      // 2. Create Tray Icon (Required by WhatsApp)
      // We use the first emoji as the tray icon, scaled to 96x96
      canvas.width = 96;
      canvas.height = 96;
      ctx.clearRect(0, 0, 96, 96);
      
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = getAppleEmojiUrl(selectedEmojis[0], 160);
        });
        ctx.drawImage(img, 0, 0, 96, 96);
      } catch (err) {
        ctx.font = '72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unifiedToChar(selectedEmojis[0]), 48, 54);
      }

      const trayBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png'); // Tray icon must be PNG
      });

      if (!trayBlob) {
        throw new Error('Failed to create tray icon');
      }

      // 3. Create metadata JSON
      // This structure is strictly required by most sticker maker apps and WhatsApp
      // We use the most compatible schema possible
      const metadata = {
        "android_play_store_link": "https://play.google.com/store/apps/details?id=com.whatsapp",
        "ios_app_store_link": "https://itunes.apple.com/app/whatsapp-messenger/id310633997",
        "sticker_packs": [
          {
            "identifier": `pack_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            "name": packName.substring(0, 128),
            "publisher": AUTHOR_NAME.substring(0, 128),
            "tray_image_file": "tray.png",
            "publisher_email": "contact@example.com",
            "publisher_website": "https://example.com",
            "privacy_policy_website": "https://example.com",
            "license_agreement_website": "https://example.com",
            "image_data_version": "1",
            "avoid_cache": false,
            "animated_sticker_pack": false,
            "stickers": webpBlobs.map((_, index) => ({
              "image_file": `${index + 1}.webp`,
              "emojis": [unifiedToChar(selectedEmojis[index])]
            }))
          }
        ]
      };

      // Reorder zip additions for better compatibility
      // Some apps are sensitive to the order of files in the zip
      zip.file('tray.png', trayBlob);
      zip.file('contents.json', JSON.stringify(metadata, null, 2));
      
      // Add legacy metadata files for universal compatibility with older apps
      zip.file('title.txt', packName.substring(0, 128));
      zip.file('author.txt', AUTHOR_NAME.substring(0, 128));
      
      webpBlobs.forEach((blob, i) => {
        // Ensure filenames are simple and consistent
        zip.file(`${i + 1}.webp`, blob);
      });

      setStatusMessage('Finalizing download...');
      setProgress(95);

      // 4. Generate the final .wastickers file
      // We use application/octet-stream to force the browser to respect the extension
      // Using compression: STORE for maximum compatibility with mobile apps
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        mimeType: 'application/octet-stream',
        compression: "STORE"
      });
      
      // 5. Trigger Download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      // .wastickers extension allows sticker apps to intercept the file
      const safeName = packName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sticker_pack';
      a.download = `${safeName}.wastickers`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatusMessage('Sticker pack generated successfully!');
      
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        setStatusMessage('');
      }, 3000);

    } catch (error) {
      console.error("Error generating pack:", error);
      setStatusMessage('An error occurred while generating the pack.');
      setIsGenerating(false);
    }
  };

  if (mode === 'pokemon') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto pt-8 px-4 sm:px-8">
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-1">
              <button
                onClick={() => setMode('emoji')}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800`}
              >
                <Smile className="w-4 h-4" />
                Emoji Mode
              </button>
              <button
                onClick={() => setMode('pokemon')}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-yellow-500 text-white shadow-lg`}
              >
                <Sparkles className="w-4 h-4" />
                Pokemon Mode
              </button>
            </div>
          </div>
        </div>
        <PokemonStickerPacker />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 relative overflow-hidden">
      {/* Falling Petals Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {petals.map((petal) => (
          <motion.div
            key={petal.id}
            initial={{ y: -100, opacity: 0, rotate: 0 }}
            animate={{ 
              y: '110vh', 
              opacity: [0, 1, 1, 0],
              rotate: 360,
              x: [0, 50, -50, 0]
            }}
            transition={{ 
              duration: parseFloat(petal.duration), 
              repeat: Infinity, 
              delay: parseFloat(petal.delay),
              ease: "linear"
            }}
            style={{
              position: 'absolute',
              left: petal.left,
              width: petal.size,
              height: petal.size,
              backgroundColor: '#ffb7c5',
              borderRadius: '100% 0% 100% 0% / 100% 0% 100% 0%',
              boxShadow: '0 0 10px rgba(255, 183, 197, 0.5)',
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <ToolActivator name="Emoji Sticker Packer" path="emoji-sticker-packer" />

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-1">
            <button
              onClick={() => setMode('emoji')}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-indigo-600 text-white shadow-lg`}
            >
              <Smile className="w-4 h-4" />
              Emoji Mode
            </button>
            <button
              onClick={() => setMode('pokemon')}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800`}
            >
              <Sparkles className="w-4 h-4" />
              Pokemon Mode
            </button>
          </div>
        </div>
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight flex items-center gap-3"
          >
            <Package className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" />
            Emoji Sticker Packer
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 dark:text-slate-400 text-lg font-medium"
          >
            Create custom WhatsApp sticker packs from your favorite emojis.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Configuration & Selection */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pack Details Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" />
                Pack Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sticker Pack Name
                  </label>
                  <input
                    type="text"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white font-medium"
                    placeholder="e.g., My Toxic Emojis ☠️"
                    maxLength={30}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Author
                  </label>
                  <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed flex items-center justify-between">
                    <span className="truncate">{AUTHOR_NAME}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Author name is permanently set.</p>
                </div>
              </div>
            </div>

            {/* Emoji Selection Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smile className="w-5 h-5 text-indigo-500" />
                    Select Emojis
                  </h2>
                  {selectedEmojis.length > 0 && (
                    <button 
                      onClick={clearAll}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  selectedEmojis.length === MAX_EMOJIS 
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}>
                  {selectedEmojis.length} / {MAX_EMOJIS}
                </span>
              </div>

              {/* Selected Emojis Grid */}
              <div className="min-h-[120px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 mb-4">
                {selectedEmojis.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                    <Smile className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No emojis selected yet.</p>
                    <p className="text-xs mt-1">Click the button below to start adding.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <AnimatePresence>
                      {selectedEmojis.map((unified) => (
                        <motion.div
                          key={unified}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="relative group"
                        >
                          <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 flex items-center justify-center text-3xl overflow-hidden">
                            <img 
                              src={getAppleEmojiUrl(unified)} 
                              alt="emoji" 
                              className="w-10 h-10 object-contain"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback to native if apple emoji fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                if (target.parentElement) {
                                  target.parentElement.innerText = unifiedToChar(unified);
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => removeEmoji(unified)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center transition-all shadow-md hover:bg-rose-600 z-20"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Emoji Picker Toggle & Randomize */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowPicker(true)}
                  disabled={selectedEmojis.length >= MAX_EMOJIS}
                  className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all relative z-30 ${
                    selectedEmojis.length >= MAX_EMOJIS
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50'
                  }`}
                >
                  <Smile className="w-5 h-5" />
                  Browse Emojis
                </button>
                
                <button
                  onClick={randomizeEmojis}
                  className="px-6 py-4 rounded-xl font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 transition-all flex items-center justify-center gap-2"
                >
                  <Smile className="w-5 h-5" />
                  Randomize
                </button>
              </div>

              {/* Emoji Picker Component - Moved outside the flex container for better positioning */}
              <AnimatePresence>
                {showPicker && (
                  <>
                    {/* Backdrop to close picker by clicking outside */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowPicker(false)}
                      className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-[2px]"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[400px] z-50 shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                        <div className="flex flex-col">
                          <h3 className="font-bold text-slate-900 dark:text-white">Choose Emojis</h3>
                          <p className="text-[10px] text-slate-500">Select at least 3 emojis</p>
                        </div>
                        <button 
                          onClick={() => setShowPicker(false)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5 text-slate-500" />
                        </button>
                      </div>
                      <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        autoFocusSearch={false}
                        theme={Theme.AUTO}
                        emojiStyle={EmojiStyle.APPLE}
                        getEmojiUrl={(unified, style) => getAppleEmojiUrl(unified, 64)}
                        width="100%"
                        height={400}
                        lazyLoadEmojis={true}
                        previewConfig={{ showPreview: false }}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Action & Info */}
          <div className="space-y-6">
            
            {/* Generate Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ready to Export?</h3>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                    <p className="mb-2"><strong>How to use:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Click generate to download a <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.wastickers</code> file.</li>
                      <li>Send this file to your phone.</li>
                      <li>Open it using a Sticker Maker app (like "Sticker Maker" on Android/iOS).</li>
                      <li>Add to WhatsApp!</li>
                    </ol>
                  </div>
                </div>
              </div>

              {statusMessage && (
                <div className="mb-4 text-sm font-medium text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 py-2 rounded-lg">
                  {statusMessage}
                </div>
              )}

              {isGenerating && (
                <div className="mb-6">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <p className="text-xs text-center text-slate-500 mt-2 font-medium">{Math.round(progress)}% Complete</p>
                </div>
              )}

              <button
                onClick={generateStickerPack}
                disabled={isGenerating || selectedEmojis.length === 0}
                className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isGenerating || selectedEmojis.length === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25 hover:-translate-y-0.5'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Pack
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
