import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Download, 
  Trash2, 
  Sparkles, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Info,
  X,
  Smile,
  RefreshCw
} from 'lucide-react';
import JSZip from 'jszip';

interface Pokemon {
  id: number;
  name: string;
  image: string;
}

const MAX_EMOJIS = 30;
const AUTHOR_NAME = 'ͲႮᏆᎫᏴᏆᎪᏞΝᎪᎫᎪᎻ·Kҽɳƈԋσ Aʅʅιαɳƈҽ';

const PRESETS = [
  { name: "Most Powerful", ids: [150, 384, 493, 483, 484, 487, 382, 383, 249, 250, 888, 889, 890, 1007, 1008, 144, 145, 146, 243, 244, 245, 373, 445, 635, 706, 784, 887, 998, 1005, 151] },
  { name: "Least Powerful", ids: [129, 11, 14, 266, 268, 349, 191, 401, 664, 824, 602, 789, 374, 63, 201, 10, 13, 16, 19, 21, 172, 175, 298, 360, 438, 439, 440, 446, 447, 458] },
  { name: "Cute Babies", ids: [172, 175, 173, 174, 240, 239, 238, 298, 360, 438, 439, 440, 446, 447, 458, 25, 133, 39, 151, 251, 385, 490, 492, 594, 700, 778, 810, 813, 816, 906] },
  { name: "Fire Starters", ids: [4, 5, 6, 155, 156, 157, 255, 256, 257, 390, 391, 392, 498, 499, 500, 653, 654, 655, 725, 726, 727, 813, 814, 815, 909, 910, 911, 58, 59, 136] },
  { name: "Water Starters", ids: [7, 8, 9, 158, 159, 160, 258, 259, 260, 393, 394, 395, 501, 502, 503, 656, 657, 658, 728, 729, 730, 816, 817, 818, 912, 913, 914, 54, 55, 134] },
  { name: "Grass Starters", ids: [1, 2, 3, 152, 153, 154, 252, 253, 254, 387, 388, 389, 495, 496, 497, 650, 651, 652, 722, 723, 724, 810, 811, 812, 906, 907, 908, 43, 44, 45] },
  { name: "Electric Shock", ids: [25, 26, 135, 145, 181, 243, 405, 466, 644, 785, 894, 923, 100, 101, 125, 172, 179, 180, 239, 309, 310, 311, 312, 403, 404, 417, 462, 479, 522, 523] },
  { name: "Ghostly Haunt", ids: [94, 93, 92, 200, 354, 356, 442, 609, 778, 887, 937, 353, 355, 425, 426, 429, 441, 477, 478, 487, 562, 563, 592, 593, 607, 608, 622, 623, 708, 709] },
  { name: "Dragon Fury", ids: [149, 373, 445, 612, 635, 706, 784, 998, 1005, 147, 148, 230, 328, 329, 330, 334, 371, 372, 384, 443, 444, 610, 611, 633, 634, 704, 705, 718, 782, 783] },
  { name: "Eevee Squad", ids: [133, 134, 135, 136, 196, 197, 470, 471, 700, 25, 172, 39, 174, 175, 176, 298, 360, 438, 439, 440, 446, 447, 458, 1, 4, 7, 152, 155, 158, 252] },
  { name: "Pink & Fluffy", ids: [39, 40, 113, 242, 531, 700, 760, 959, 35, 36, 173, 174, 183, 184, 209, 210, 241, 298, 300, 301, 427, 428, 440, 517, 518, 682, 683, 684, 685, 759] },
  { name: "Kanto OG 151", ids: [25, 6, 9, 3, 150, 151, 94, 130, 59, 65, 68, 131, 143, 1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 35, 37, 39, 41, 43] },
  { name: "Mega Evolutions", ids: [150, 448, 257, 282, 94, 373, 376, 384, 6, 9, 3, 15, 18, 65, 80, 115, 127, 130, 142, 181, 212, 214, 229, 248, 254, 260, 302, 303, 306, 308] },
  { name: "Dark Shadows", ids: [248, 491, 571, 717, 727, 859, 983, 197, 198, 215, 228, 229, 261, 262, 273, 274, 275, 302, 318, 319, 331, 332, 341, 342, 359, 430, 434, 435, 442, 452] },
  { name: "Steel Fortress", ids: [208, 227, 306, 376, 483, 448, 823, 1000, 81, 82, 462, 597, 598, 601, 624, 625, 632, 679, 680, 681, 707, 748, 777, 797, 808, 809, 884, 888, 889, 958] },
  { name: "Psychic Minds", ids: [65, 97, 196, 282, 376, 475, 791, 792, 63, 64, 79, 80, 102, 103, 122, 124, 150, 151, 177, 178, 199, 201, 202, 236, 238, 249, 251, 280, 281, 307] },
];

const PokemonStickerPacker: React.FC = () => {
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon[]>([]);
  const [packName, setPackName] = useState('My Pokemon Pack');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Pokemon[]>([]);

  // 1. Load & Cache Pokemon Data
  useEffect(() => {
    const loadPokemon = async () => {
      try {
        const cachedData = localStorage.getItem('pokemon_cache_v1');
        if (cachedData) {
          setAllPokemon(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        // Fetch basic list (Names and IDs)
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const data = await response.json();
        
        const formattedData = data.results.map((p: any, index: number) => {
          const id = index + 1;
          return {
            id,
            name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
            // High quality official artwork
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
          };
        });

        localStorage.setItem('pokemon_cache_v1', JSON.stringify(formattedData));
        setAllPokemon(formattedData);
      } catch (error) {
        console.error('Failed to load Pokemon:', error);
        setStatusMessage('Failed to load Pokemon data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadPokemon();
  }, []);

  // 2. Search & Suggestions Logic
  const filteredPokemon = useMemo(() => {
    if (!searchQuery.trim()) return allPokemon.slice(0, 50); // Show first 50 by default
    return allPokemon.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.id.toString() === searchQuery
    );
  }, [searchQuery, allPokemon]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const matches = allPokemon
        .filter(p => p.name.toLowerCase().startsWith(searchQuery.toLowerCase()))
        .slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, allPokemon]);

  const togglePokemon = (pokemon: Pokemon) => {
    if (selectedPokemon.find(p => p.id === pokemon.id)) {
      setSelectedPokemon(selectedPokemon.filter(p => p.id !== pokemon.id));
    } else {
      if (selectedPokemon.length >= MAX_EMOJIS) {
        setStatusMessage(`Max ${MAX_EMOJIS} stickers allowed!`);
        setTimeout(() => setStatusMessage(''), 3000);
        return;
      }
      setSelectedPokemon([...selectedPokemon, pokemon]);
    }
  };

  const randomizePokemon = () => {
    const shuffled = [...allPokemon].sort(() => 0.5 - Math.random());
    setSelectedPokemon(shuffled.slice(0, 30));
    setPackName('Random Pokemon Pack');
    setStatusMessage('Random 30 Pokemon selected!');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const selected = allPokemon.filter(p => preset.ids.includes(p.id));
    setSelectedPokemon(selected.slice(0, 30));
    setPackName(preset.name);
    setStatusMessage(`${preset.name} preset applied!`);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const generateStickerPack = async () => {
    if (selectedPokemon.length < 3) {
      setStatusMessage('WhatsApp requires at least 3 stickers.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Preparing your Pokemon stickers...');

    try {
      const zip = new JSZip();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');

      canvas.width = 512;
      canvas.height = 512;

      const webpBlobs: Blob[] = [];

      // Process each Pokemon
      for (let i = 0; i < selectedPokemon.length; i++) {
        const p = selectedPokemon[i];
        setStatusMessage(`Processing ${p.name}...`);
        setProgress(((i) / (selectedPokemon.length + 1)) * 100);

        ctx.clearRect(0, 0, 512, 512);
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = p.image;
        });

        // Draw with margin
        const margin = 32;
        ctx.drawImage(img, margin, margin, 512 - (margin * 2), 512 - (margin * 2));

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.7));
        if (blob) webpBlobs.push(blob);
      }

      // Create Tray Icon
      canvas.width = 96;
      canvas.height = 96;
      ctx.clearRect(0, 0, 96, 96);
      const trayImg = new Image();
      trayImg.crossOrigin = "anonymous";
      await new Promise((resolve) => {
        trayImg.onload = resolve;
        trayImg.src = selectedPokemon[0].image;
      });
      ctx.drawImage(trayImg, 0, 0, 96, 96);
      const trayBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

      if (!trayBlob) throw new Error('Tray icon failed');

      // Metadata
      const metadata = {
        "android_play_store_link": "https://play.google.com/store/apps/details?id=com.whatsapp",
        "ios_app_store_link": "https://itunes.apple.com/app/whatsapp-messenger/id310633997",
        "sticker_packs": [{
          "identifier": `poke_pack_${Date.now()}`,
          "name": packName.substring(0, 128),
          "publisher": AUTHOR_NAME.substring(0, 128),
          "tray_image_file": "tray.png",
          "image_data_version": "1",
          "avoid_cache": false,
          "animated_sticker_pack": false,
          "stickers": webpBlobs.map((_, index) => ({
            "image_file": `${index + 1}.webp`,
            "emojis": ["⚡"] // Default pokemon emoji
          }))
        }]
      };

      zip.file('tray.png', trayBlob);
      zip.file('contents.json', JSON.stringify(metadata, null, 2));
      zip.file('title.txt', packName);
      zip.file('author.txt', AUTHOR_NAME);
      webpBlobs.forEach((blob, i) => zip.file(`${i + 1}.webp`, blob));

      const zipBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/octet-stream', compression: "STORE" });
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packName.replace(/\s+/g, '_')}.wastickers`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatusMessage('Pack downloaded successfully!');
      setProgress(100);
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      console.error(error);
      setStatusMessage('Error generating pack. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                POKÉMON STUDIO <Sparkles className="text-yellow-500 fill-yellow-500" />
              </h1>
              <p className="text-slate-500 text-sm">Create custom Pokémon sticker packs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search Pokemon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                />
                
                {/* Suggestions */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      {suggestions.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            togglePokemon(p);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                        >
                          <img src={p.image} alt={p.name} className="w-8 h-8 object-contain" />
                          <span className="text-sm font-medium">{p.name}</span>
                          <span className="text-[10px] text-slate-500 ml-auto">#{p.id}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
             <button 
               onClick={randomizePokemon}
               className="p-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 rounded-xl hover:bg-yellow-200 transition-colors"
               title="Randomize"
             >
               <RefreshCw className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Presets Section */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-yellow-500" /> Sticker Pack Presets
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyPreset(preset)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold hover:border-yellow-500 hover:text-yellow-600 transition-all shadow-sm"
              >
                {preset.name}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Grid */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
                <p className="text-slate-500 animate-pulse">Loading Pokémon Database...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filteredPokemon.map(p => {
                  const isSelected = selectedPokemon.find(s => s.id === p.id);
                  return (
                    <motion.button
                      key={p.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => togglePokemon(p)}
                      className={`relative aspect-square p-2 rounded-2xl border-2 transition-all group ${
                        isSelected 
                          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-yellow-200'
                      }`}
                    >
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-xl transition-all"
                        loading="lazy"
                      />
                      <div className="absolute bottom-1 left-0 right-0 text-center">
                        <p className="text-[10px] font-bold truncate px-1 text-slate-400 group-hover:text-yellow-600">
                          {p.name}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full shadow-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
            
            {!loading && filteredPokemon.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate-500">No Pokémon found matching "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Sidebar / Selection */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  Selection <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-sm">{selectedPokemon.length}/{MAX_EMOJIS}</span>
                </h2>
                {selectedPokemon.length > 0 && (
                  <button 
                    onClick={() => setSelectedPokemon([])}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {selectedPokemon.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <Smile className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">Select Pokémons from the grid to start</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 mb-6 max-h-64 overflow-y-auto p-1">
                  {selectedPokemon.map(p => (
                    <div key={p.id} className="relative group">
                      <img src={p.image} alt={p.name} className="w-full aspect-square object-contain bg-slate-50 dark:bg-slate-800 rounded-lg p-1" />
                      <button 
                        onClick={() => togglePokemon(p)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pack Name</label>
                  <input 
                    type="text"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium"
                    placeholder="E.g. Legendary Pack"
                  />
                </div>

                <button
                  onClick={generateStickerPack}
                  disabled={isGenerating || selectedPokemon.length < 3}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isGenerating || selectedPokemon.length < 3
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/30'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {Math.round(progress)}%
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Generate Pack
                    </>
                  )}
                </button>
              </div>

              {statusMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-medium flex items-center gap-2"
                >
                  <Info className="w-4 h-4 flex-shrink-0" />
                  {statusMessage}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonStickerPacker;
