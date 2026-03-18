import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Play, Heart, RotateCw, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";

type Tool = {
  id: string;
  tool_name: string;
  description: string;
  credit_cost: number;
  category: string;
};

export function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favoriteTools, setFavoriteTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const favoritesRef = collection(db, "profiles", user.id, "favorites");
      const favoritesSnap = await getDocs(favoritesRef);
      
      const toolsList: Tool[] = [];
      
      for (const favoriteDoc of favoritesSnap.docs) {
        const toolId = favoriteDoc.id;
        const toolRef = doc(db, "tools", toolId);
        const toolSnap = await getDoc(toolRef);
        
        if (toolSnap.exists()) {
          const data = toolSnap.data();
          toolsList.push({
            id: toolSnap.id,
            tool_name: data.tool_name || "",
            description: data.description || "",
            credit_cost: data.credit_cost || 0,
            category: data.category || "General"
          });
        }
      }
      
      setFavoriteTools(toolsList);
    } catch (err: any) {
      console.error("Error fetching favorites:", err);
      setError("Failed to load favorites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user?.id]);

  const toggleFavorite = async (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const favoriteRef = doc(db, "profiles", user.id, "favorites", toolId);
      await deleteDoc(favoriteRef);
      setFavoriteTools(prev => prev.filter(t => t.id !== toolId));
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const handleExecute = (tool: Tool) => {
    const toolName = (tool.tool_name || "").trim();
    if (!toolName) return;
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
      "Integrated Development Environment (IDE)": "/ide-tool",
      "IDE Tool": "/ide-tool",
      "Image Dataset Collector": "/image-dataset-collector",
      "WA ~ S generator": "/wa-s-generator",
      "PFP Anima": "/pfp-anima",
      "Html viewer": "/html-viewer"
    };

    if (explicitMappings[toolName]) {
      navigate(explicitMappings[toolName]);
    } else {
      const slug = toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      navigate(`/${slug}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
            My Favorites
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Your most used and loved tools in one place.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading your favorites...</p>
        </div>
      ) : favoriteTools.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <Heart className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No favorites yet</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Click the heart icon on any tool card in the dashboard to add it to your favorites for quick access.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Browse Tools
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {favoriteTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative group"
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={(e) => toggleFavorite(e, tool.id)}
                  className="p-1.5 rounded-full transition-colors bg-rose-50 dark:bg-rose-900/20 text-rose-500"
                  title="Remove from favorites"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
              <div className="flex-1 mt-2">
                <div className="flex items-start justify-between mb-2 pr-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{tool.tool_name}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim()}
                </p>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full self-start">
                  <span className="mr-1.5">💳</span>
                  {tool.credit_cost} Credits
                </div>

                <button
                  onClick={() => handleExecute(tool)}
                  className="flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
                >
                  <Play className="w-4 h-4 mr-2" /> Launch Tool
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
