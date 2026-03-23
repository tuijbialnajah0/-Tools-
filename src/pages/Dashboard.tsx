import React, { useState, useMemo } from "react";
import { 
  Play, 
  RotateCw, 
  Image, 
  QrCode, 
  Code, 
  FileText, 
  MessageSquare, 
  Layers, 
  Smile, 
  Video, 
  Download,
  Zap,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

type Tool = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  isNew?: boolean;
  isPopular?: boolean;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const tools: Tool[] = [
    { id: 'background-remover', name: 'Background Remover', description: 'Remove backgrounds instantly with Offline AI or Gemini Cloud. [STATUS:working]', category: 'Image', icon: Image, isPopular: true },
    { id: 'qr-code-generator', name: 'QR Code Generator', description: 'Generate custom QR codes for any URL. [STATUS:working]', category: 'Utility', icon: QrCode },
    { id: 'smart-code-generator', name: 'Smart Code Generator', description: 'AI-powered code generation for developers. [STATUS:working]', category: 'Developer', icon: Code, isPopular: true },
    { id: 'pdf-converter', name: 'Pdf Converter', description: 'Convert documents to and from PDF format. [STATUS:working]', category: 'Utility', icon: FileText },
    { id: 'whatsapp-s-create', name: 'Whatsapp-S-Create', description: 'Create custom stickers for WhatsApp. [STATUS:working]', category: 'Social', icon: MessageSquare },
    { id: 'image-dataset-collector', name: 'Image Dataset Collector', description: 'Collect and manage high-quality image datasets. Optimized for Anime, Cosplay, and Fanart. [STATUS:working]', category: 'Utility', icon: Layers },
    { id: 'wa-s-generator', name: 'WA ~ S generator', description: 'WhatsApp sticker generation tool. [STATUS:working]', category: 'Social', icon: Smile, isNew: true },
    { id: 'pfp-anima', name: 'PFP Anima', description: 'Animate your profile pictures. [STATUS:working]', category: 'Image', icon: Zap, isNew: true },
    { id: 'image-colourizer', name: 'Image Colourizer', description: 'Bring old black and white photos to life with AI colorization. [STATUS:working]', category: 'Image', icon: Image, isNew: true },
    { id: 'notes-create', name: 'Notes Create', description: 'Convert any PDF into smart, bullet-point notes instantly. 100% offline. [STATUS:working]', category: 'Utility', icon: FileText, isPopular: true },
  ];

  const handleExecute = (tool: Tool) => {
    const toolName = (tool.name || "").trim();
    if (!toolName) return;
    
    const explicitMappings: Record<string, string> = {
      "Background Remover": "/background-remover",
      "Whatsapp-S-Create": "/whatsapp-s-create",
      "QR Code Generator": "/qr-code-generator",
      "Smart Code Generator": "/smart-code-generator",
      "Pdf Converter": "/pdf-converter",
      "Image Dataset Collector": "/image-dataset-collector",
      "WA ~ S generator": "/wa-s-generator",
      "PFP Anima": "/pfp-anima",
      "Image Colourizer": "/image-colourizer",
      "Notes Create": "/notes-create"
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

  const categories = useMemo(() => 
    ["All", ...Array.from(new Set(tools.map((t) => t.category))).filter(Boolean)],
    [tools]
  );
  
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory;
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, tools]);

  const popularTools = useMemo(() => tools.filter(t => t.isPopular), [tools]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Search & Filter Bar */}
      <div className="sticky top-4 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search for tools (e.g. 'background', 'pdf', 'sticker')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-2 hidden md:block" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedCategory === category
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-16">
        {/* Popular Tools (Only if no search) */}
        {!searchQuery && selectedCategory === "All" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                Most Popular
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onExecute={handleExecute} variant="compact" />
              ))}
            </div>
          </section>
        )}

        {/* All Tools / Search Results */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {searchQuery ? `Search Results (${filteredTools.length})` : `${selectedCategory} Tools`}
            </h2>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                Clear Search
              </button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {filteredTools.map((tool) => (
                  <ToolCard 
                    key={tool.id} 
                    tool={tool} 
                    onExecute={handleExecute} 
                  />
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800"
              >
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No tools found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or category filter.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}

function ToolCard({ 
  tool, 
  onExecute,
  variant = "default"
}: { 
  tool: Tool; 
  onExecute: (tool: Tool) => void;
  variant?: "default" | "compact";
}) {
  const statusMatch = tool.description.match(/\[STATUS:(working|development)\]/);
  const cleanDesc = tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim();
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col will-change-transform ${variant === 'compact' ? 'h-full' : ''}`}
    >
      <div className="mb-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200 shadow-inner">
          <Icon className="w-7 h-7" />
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{tool.name}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
          {cleanDesc}
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {tool.category}
        </span>
        <button
          onClick={() => onExecute(tool)}
          className="flex items-center text-sm font-black text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform"
        >
          Launch <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </motion.div>
  );
}
