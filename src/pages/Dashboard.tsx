import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Play, CheckCircle2, Settings, Heart, RotateCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { syncDefaultTools, DEFAULT_TOOLS } from "../lib/defaultTools";

type Tool = {
  id: number;
  tool_name: string;
  description: string;
  credit_cost: number;
  category: string;
};

export function Dashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [favoriteToolIds, setFavoriteToolIds] = useState<number[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const fetchData = async (forceSync = false) => {
    try {
      setLoadingTools(true);
      if (forceSync) setSyncing(true);
      
      // Sync default tools first to ensure they exist in the database
      // Add a timeout so it doesn't hang the dashboard if Supabase is slow
      try {
        await Promise.race([
          syncDefaultTools(forceSync),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch (syncErr) {
        console.warn("Sync default tools failed or timed out:", syncErr);
      }
      
      const fetchPromise = Promise.allSettled([
        supabase.from("tools").select("*").eq("enabled", true),
        user ? supabase.from("favorites").select("tool_id").eq("user_id", user.id) : Promise.resolve({ data: [], error: null })
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Fetch timeout")), 15000)
      );

      const [toolsRes, favoritesRes] = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (toolsRes.status === 'fulfilled' && toolsRes.value.data) {
        // Filter out duplicates by tool_name (case-insensitive)
        const seenNames = new Set<string>();
        const uniqueTools = toolsRes.value.data.filter((tool: Tool) => {
          const normalizedName = tool.tool_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (seenNames.has(normalizedName)) {
            return false;
          }
          seenNames.add(normalizedName);
          return true;
        });
        setTools(uniqueTools);
        setError(null); // Clear error if tools are loaded
      } else if (toolsRes.status === 'rejected' || (toolsRes.status === 'fulfilled' && toolsRes.value.error)) {
        const fetchError = toolsRes.status === 'fulfilled' ? toolsRes.value.error : toolsRes.reason;
        console.error("Tools fetch error:", fetchError);
        
        // If we have some tools already (from previous load), don't show error
        if (tools.length === 0) {
          throw fetchError;
        }
      }

      if (favoritesRes.status === 'fulfilled' && favoritesRes.value.data) {
        setFavoriteToolIds(favoritesRes.value.data.map((f: any) => f.tool_id));
      } else {
        console.warn("Favorites table might be missing or inaccessible");
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      
      // Fallback to default tools if database fetch fails
      if (tools.length === 0) {
        console.warn("Falling back to default tools due to fetch error");
        const fallbackTools = DEFAULT_TOOLS.map((t, index) => ({
          id: -(index + 1), // Negative IDs for fallback tools
          ...t
        }));
        setTools(fallbackTools);
        setError("Note: Using offline tool list. Some features may be limited.");
      } else {
        const message = err.message || "Unknown error";
        if (message.includes("timeout")) {
          setError("Connection timed out. Please check your internet and try again.");
        } else if (message.includes("JWT")) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError("Failed to load tools. Please try again later.");
        }
      }
    } finally {
      setLoadingTools(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, user?.role]);

  const handleSync = () => {
    fetchData(true);
  };

  const toggleFavorite = async (e: React.MouseEvent, toolId: number) => {
    e.stopPropagation();
    if (!user) return;

    const isFavorite = favoriteToolIds.includes(toolId);
    
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("tool_id", toolId);
        
        if (error) throw error;
        setFavoriteToolIds(prev => prev.filter(id => id !== toolId));
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert([{ user_id: user.id, tool_id: toolId }]);
        
        if (error) throw error;
        setFavoriteToolIds(prev => [...prev, toolId]);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleExecute = (tool: Tool) => {
    const toolName = tool.tool_name.trim();
    
    // Explicit mappings for known tools to ensure they always work
    const explicitMappings: Record<string, string> = {
      "Background Remover": "/background-remover",
      "Whatsapp-S-Create": "/whatsapp-s-create",
      "Image Upscaler": "/image-upscaler",
      "Image Colorizer": "/image-colorizer",
      "QR Code Generator": "/qr-code-generator",
      "Smart Code Generator": "/smart-code-generator",
      "Code base": "/code-base",
      "Pdf Converter": "/pdf-converter",
      "Whatsapp-S-Create Video": "/whatsapp-s-create-video",
      "Image Dataset Collector": "/image-dataset-collector",
      "WA ~ S generator": "/wa-s-generator",
      "PFP Anima": "/pfp-anima"
    };

    if (explicitMappings[toolName]) {
      navigate(explicitMappings[toolName]);
    } else {
      // Robust slug generation for other tools
      const slug = toolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      navigate(`/${slug}`);
    }
  };

  const categories = Array.from(new Set(tools.map((t) => t.category)));
  const favoriteTools = tools.filter(t => favoriteToolIds.includes(t.id));
  
  const filteredTools = selectedCategory === "All" 
    ? tools 
    : selectedCategory === "Favorites"
    ? favoriteTools
    : tools.filter(t => t.category === selectedCategory);

  const displayedCategories = selectedCategory === "All" 
    ? categories 
    : selectedCategory === "Favorites"
    ? ["Favorites"]
    : [selectedCategory];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Welcome back!</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Select a tool below to get started.</p>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`sm:hidden p-2 text-slate-400 hover:text-indigo-600 transition-all ${syncing ? 'animate-spin text-indigo-600' : ''}`}
            title="Sync Tools"
          >
            <RotateCw size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`hidden sm:flex items-center px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RotateCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Tools'}
          </button>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="flex items-center justify-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Panel
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
          <button 
            onClick={() => fetchData(true)}
            className="text-sm font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loadingTools && tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === "All"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {favoriteToolIds.length > 0 && (
            <button
              onClick={() => setSelectedCategory("Favorites")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                selectedCategory === "Favorites"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 mr-1.5 ${selectedCategory === "Favorites" ? "fill-current" : ""}`} />
              Favorites
            </button>
          )}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {loadingTools ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading available tools...</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No tools are currently available. Please check back later.</p>
          </div>
        ) : selectedCategory === "Favorites" && favoriteTools.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">You haven't added any tools to your favorites yet.</p>
          </div>
        ) : (
          <>
            {displayedCategories.map((category) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredTools
                    .filter((t) => category === "Favorites" || t.category === category)
                    .map((tool) => (
                      <ToolCard 
                        key={tool.id} 
                        tool={tool} 
                        isFavorite={favoriteToolIds.includes(tool.id)} 
                        onToggleFavorite={toggleFavorite} 
                        onExecute={handleExecute} 
                      />
                    ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ToolCard({ 
  tool, 
  isFavorite, 
  onToggleFavorite, 
  onExecute 
}: { 
  tool: Tool; 
  isFavorite: boolean; 
  onToggleFavorite: (e: React.MouseEvent, id: number) => void | Promise<void>; 
  onExecute: (tool: Tool) => void;
  key?: React.Key;
}) {
  const statusMatch = tool.description.match(/\[STATUS:(working|development)\]/);
  const status = statusMatch ? statusMatch[1] : 'working';
  const cleanDesc = tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim();

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative group"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={(e) => onToggleFavorite(e, tool.id)}
          className={`p-1.5 rounded-full transition-colors ${
            isFavorite 
              ? "bg-rose-50 dark:bg-rose-900/20 text-rose-500" 
              : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
          }`}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
        {status === 'working' ? (
          <span className="flex items-center text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full" title="Working">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
            Working
          </span>
        ) : (
          <span className="flex items-center text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full" title="Under Development">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
            In Dev
          </span>
        )}
      </div>
      <div className="flex-1 mt-2">
        <div className="flex items-start justify-between mb-2 pr-20">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{tool.tool_name}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
          {cleanDesc}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full self-start">
          <span className="mr-1.5">💳</span>
          {tool.credit_cost} Credits
        </div>

        <button
          onClick={() => onExecute(tool)}
          className="flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
        >
          <Play className="w-4 h-4 mr-2" /> Launch Tool
        </button>
      </div>
    </div>
  );
}
