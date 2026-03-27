import React, { useState, useMemo, useEffect } from "react";
import { 
  Play,
   
  RotateCw, 
  Image, 
  QrCode, 
  Code, 
  Globe,
  FileText, 
  FileCode,
  MessageSquare, 
  Layers, 
  Smile, 
  Video, 
  Download,
  Zap,
  Waves,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Star,
  MonitorPlay,
  Palette
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

type Tool = {
  id: string;
  name: string;
  description: string;
  category: string | string[];
  icon: React.ElementType;
  isPopular?: boolean;
  inDevelopment?: boolean;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All Tools");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("favorite-tools");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("favorite-tools", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const tools: Tool[] = [
    { id: 'background-remover', name: 'BG Remover', description: 'AI background removal.', category: ['Image & Photo', 'AI Tools'], icon: Image, isPopular: true, inDevelopment: true },
    { id: 'qr-code-generator', name: 'QR Generator', description: 'Create custom QR codes.', category: 'Utility', icon: QrCode },
    { id: 'smart-code-generator', name: 'Smart Code', description: 'Extract code from text.', category: 'Utility', icon: Code, isPopular: true },
    { id: 'code-base', name: 'Code Base', description: 'AI code builder & preview.', category: ['AI Tools'], icon: FileCode, isPopular: true, inDevelopment: true },
    { id: 'pdf-converter', name: 'PDF Converter', description: 'PDF conversion tools.', category: 'Utility', icon: FileText },
    { id: 'whatsapp-s-create', name: 'WA Sticker', description: 'Create WhatsApp stickers.', category: 'Social', icon: MessageSquare },
    { id: 'image-dataset-collector', name: 'Image Data-Set Collector', description: 'Collect images for AI.', category: 'Utility', icon: Layers },
    { id: 'wa-s-generator', name: 'WA Generator', description: 'AI sticker generation.', category: 'Social', icon: Smile },
    { id: 'pfp-anima', name: 'PFP Anima', description: 'Animate profile pictures.', category: 'Image & Photo', icon: Zap },
    { id: 'image-colourizer', name: 'Image colorizer', description: 'Colorize B&W photos.', category: ['Image & Photo', 'AI Tools'], icon: Image, inDevelopment: true },
    { id: 'notes-create', name: 'Notes Create', description: 'PDF/HTML to smart notes.', category: 'AI Tools', icon: FileText, isPopular: true },
    { id: 'text-to-cinematic-notes', name: 'Text To Notes', description: 'Text to study experience.', category: 'AI Tools', icon: Sparkles },
    { id: 'html-viewer', name: 'HTML Viewer', description: 'Sandbox HTML preview.', category: 'Utility', icon: FileCode },
    { id: 'text-to-image', name: 'Text to Image', description: 'AI image generation.', category: 'AI Tools', icon: Image, inDevelopment: true },
    { id: 'image-compressor', name: 'Image compressor', description: 'Browser-based compression.', category: 'Utility', icon: Image },
    { id: 'bulk-image-compressor', name: 'Bulk Image Compressor', description: 'Batch image compression.', category: 'Utility', icon: Layers },
    { id: 'code-formatter', name: 'Code Formatter', description: 'Clean & format code.', category: 'Utility', icon: Code },
    { id: 'image-to-text', name: 'Image to Text', description: 'Extract text from images.', category: ['Image & Photo', 'Utility'], icon: FileText },
    { id: 'document-to-text', name: 'Document to Text', description: 'Extract text from docs.', category: 'Utility', icon: FileText },
    { id: 'image-formatter', name: 'Image Formatter', description: 'Convert image formats offline.', category: 'Image & Photo', icon: Image },
    { id: 'word-counter', name: 'Word Counter', description: 'Count words, chars, and paragraphs.', category: 'Utility', icon: FileText },
    { id: 'favicon-generator', name: 'Favicon', description: 'Generate favicon sets from images.', category: 'Utility', icon: Image },
    { id: 'video-to-audio', name: 'Video to Audio', description: 'Extract audio from video files.', category: 'Utility', icon: Video },
    { id: 'color-palette', name: 'Color Palette', description: 'Extract colors from images or generate random palettes.', category: 'Design', icon: Palette },
    { id: 'notes-viewer', name: 'Notes Viewer', description: 'Manage your smart notes.', category: 'Utility', icon: MonitorPlay },
    { id: 'emoji-art', name: 'Emoji Art', description: 'Convert photos into emoji pixel art.', category: ['Image & Photo', 'Social'], icon: Smile },
    { id: 'api-tester', name: 'API Tester', description: 'Test REST APIs with proxy support.', category: 'Utility', icon: Globe, inDevelopment: true },
    { id: 'audio-visualiser', name: 'Audio Visualiser', description: 'Convert MP3 to animated sound wave videos.', category: ['Social', 'Utility'], icon: MonitorPlay, inDevelopment: true },
  ];

  const handleExecute = (tool: Tool) => {
    const toolName = (tool.name || "").trim();
    if (!toolName) return;
    
    const explicitMappings: Record<string, string> = {
      "BG Remover": "/background-remover",
      "WA Sticker": "/whatsapp-s-create",
      "QR Generator": "/qr-code-generator",
      "Smart Code": "/smart-code-generator",
      "Code Base": "/code-base",
      "PDF Converter": "/pdf-converter",
      "Image Data-Set Collector": "/image-dataset-collector",
      "WA Generator": "/wa-s-generator",
      "PFP Anima": "/pfp-anima",
      "Image colorizer": "/image-colourizer",
      "Notes Create": "/notes-create",
      "Text To Notes": "/text-to-cinematic-notes",
      "HTML Viewer": "/html-viewer",
      "Text to Image": "/text-to-image",
      "Image compressor": "/image-compressor",
      "Bulk Image Compressor": "/bulk-image-compressor",
      "Code Formatter": "/code-formatter",
      "Image to Text": "/image-to-text",
      "Document to Text": "/document-to-text",
      "Image Formatter": "/image-formatter",
      "Word Counter": "/word-counter",
      "Favicon": "/favicon-generator",
      "Video to Audio": "/video-to-audio",
      "Color Palette": "/color-palette",
      "Notes Viewer": "/notes-viewer",
      "Emoji Art": "/emoji-art",
      "API Tester": "/api-tester",
      "Audio Visualiser": "/audio-visualiser",
    };

    if (explicitMappings[toolName]) {
      navigate(explicitMappings[toolName]);
    } else {
      const slug = toolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      navigate(`/${slug}`);
    }
  };

  const categories = useMemo(() => {
    const allCategories = tools
      .filter(t => !t.inDevelopment)
      .flatMap(t => Array.isArray(t.category) ? t.category : [t.category]);
    return ["All Tools", "Favorites", "In Development", ...Array.from(new Set(allCategories)).filter(Boolean)];
  }, [tools]);
  
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const toolCategories = Array.isArray(tool.category) ? tool.category : [tool.category];
      
      let matchesCategory = false;
      if (selectedCategory === "In Development") {
        matchesCategory = !!tool.inDevelopment;
      } else if (selectedCategory === "All Tools") {
        matchesCategory = !tool.inDevelopment;
      } else if (selectedCategory === "Favorites") {
        matchesCategory = favorites.includes(tool.id) && !tool.inDevelopment;
      } else {
        matchesCategory = toolCategories.includes(selectedCategory) && !tool.inDevelopment;
      }

      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, tools, favorites]);

  const popularTools = useMemo(() => tools.filter(t => t.isPopular && !t.inDevelopment), [tools]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-indigo-100 dark:selection:bg-indigo-900/30 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 pt-12 sm:pt-20 space-y-12 sm:space-y-20">
        
        {/* Premium Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[0.9] whitespace-nowrap"
            >
              Beyond <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Journey's End</span>
            </motion.h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl font-medium max-w-lg">
              In total {tools.filter(t => !t.inDevelopment).length} tools, still half baked.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-full lg:w-[400px] group"
          >
            <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="Search for tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white shadow-xl shadow-slate-200/50 dark:shadow-none text-lg font-medium"
              />
            </div>
          </motion.div>
        </header>

        {/* Horizontal Category Wheel */}
        <div className="relative">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-4 mask-fade-edges scroll-smooth">
            {categories.map((category, idx) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-8 py-4 rounded-2xl text-base font-bold transition-all duration-300 border ${
                  selectedCategory === category
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/40"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-24">
          {/* All Tools Grid */}
          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                {searchQuery ? `Search Results (${filteredTools.length})` : `${selectedCategory}`}
              </h2>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTools.map((tool) => (
                    <ToolCard 
                      key={tool.id} 
                      tool={tool} 
                      onExecute={handleExecute} 
                      isFavorite={favorites.includes(tool.id)}
                      onToggleFavorite={(e) => toggleFavorite(tool.id, e)}
                    />
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                >
                  <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Search className="w-16 h-16 text-slate-300" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">No tools found</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-lg">Try a different search term or category.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ 
  tool, 
  onExecute,
  isFavorite,
  onToggleFavorite
}: { 
  tool: Tool; 
  onExecute: (tool: Tool) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const Icon = tool.icon;
  const cleanDesc = tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex items-center gap-6 shadow-sm hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-500 min-h-[140px] sm:min-h-[160px] overflow-hidden"
    >
      {/* Favorite Button */}
      <button
        onClick={onToggleFavorite}
        className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-all duration-300 cursor-pointer ${
          isFavorite 
            ? 'text-amber-400 bg-amber-50 dark:bg-amber-400/10' 
            : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10'
        }`}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* Icon Section */}
      <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner overflow-hidden">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>
      
      {/* Content Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 mb-1.5">
          <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
            {tool.name}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug font-medium">
          {cleanDesc}
        </p>
      </div>

      {/* Action Section */}
      <div className="shrink-0">
        <button
          onClick={() => onExecute(tool)}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 transform active:scale-90 transition-all group-hover:rotate-[-12deg]"
        >
          <ArrowRight className="w-6 h-6 sm:w-8 h-8" />
        </button>
      </div>

      {/* Decorative Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 pointer-events-none transition-all duration-500" />
    </motion.div>
  );
}
