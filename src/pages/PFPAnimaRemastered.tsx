import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, 
  Search, 
  Download, 
  Image as ImageIcon, 
  ChevronRight, 
  Loader2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles,
  CheckCircle2,
  Trash2,
  FileArchive,
  Layers,
  Check,
  X,
  Info
} from "lucide-react";
import JSZip from "jszip";
import { motion, AnimatePresence } from "motion/react";

interface ImageData {
  id: string;
  url: string;
  thumbnail: string;
  source: string;
  sourceUrl: string;
  title: string;
  width?: number;
  height?: number;
}

export function PFPAnimaRemastered() {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadType, setDownloadType] = useState<'zip' | 'individual' | null>(null);

  const imagesPerPage = 30;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    setIsSearching(true);
    setSearchProgress(0);
    setError(null);
    setAllImages([]);
    setSelectedIds(new Set());
    setCurrentPage(1);
    setStatusMessage("Connecting to DuckDuckGo...");

    try {
      setSearchProgress(20);
      const response = await fetch(`/api/search-duckduckgo?q=${encodeURIComponent(keyword + " anime pfp aesthetic")}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      setSearchProgress(60);
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error("No images found. Try a different keyword.");
      }

      setSearchProgress(90);
      
      // Deduplicate results by URL hash and filename
      const seenHashes = new Set<string>();
      const seenFilenames = new Set<string>();
      const uniqueResults = (data.results || []).filter((img: any) => {
        const hash = img.url.split('?')[0].toLowerCase();
        const filename = hash.split('/').pop() || '';
        
        if (seenHashes.has(hash) || (filename && seenFilenames.has(filename))) {
          return false;
        }
        
        seenHashes.add(hash);
        if (filename) seenFilenames.add(filename);
        return true;
      });

      setAllImages(uniqueResults);
      setSearchProgress(100);
    } catch (err: any) {
      setError(err.message || "An error occurred during search.");
    } finally {
      setIsSearching(false);
      setStatusMessage("");
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllOnPage = () => {
    const currentImages = allImages.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);
    const newSelected = new Set(selectedIds);
    currentImages.forEach(img => newSelected.add(img.id));
    setSelectedIds(newSelected);
  };

  const deselectAllOnPage = () => {
    const currentImages = allImages.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);
    const newSelected = new Set(selectedIds);
    currentImages.forEach(img => newSelected.delete(img.id));
    setSelectedIds(newSelected);
  };

  const selectAllPages = () => {
    const newSelected = new Set(selectedIds);
    allImages.forEach(img => newSelected.add(img.id));
    setSelectedIds(newSelected);
  };

  const deselectAllPages = () => {
    setSelectedIds(new Set());
  };

  const downloadSelected = async (type: 'zip' | 'individual') => {
    if (selectedIds.size === 0) return;

    const selectedImages = allImages.filter(img => selectedIds.has(img.id));
    setIsDownloading(true);
    setDownloadType(type);
    setDownloadProgress(0);
    setError(null);

    try {
      if (type === 'zip') {
        const zip = new JSZip();
        let successCount = 0;
        let completedCount = 0;
        
        // Concurrent queue system
        const concurrency = 10;
        let currentIndex = 0;
        
        const processNext = async (): Promise<void> => {
          if (currentIndex >= selectedImages.length) return;
          
          const index = currentIndex++;
          const img = selectedImages[index];
          
          try {
            // Try direct fetch first, then proxy
            let response = await fetch(img.url).catch(() => null);
            if (!response || !response.ok) {
              response = await fetch(`/api/image-proxy?url=${encodeURIComponent(img.url)}`);
            }
            
            if (response && response.ok) {
              const blob = await response.blob();
              const ext = img.url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
              const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              const safeId = img.id.replace(/[^a-z0-9]/gi, '_');
              const filename = `anima_${safeKeyword}_${safeId}.${ext}`;
              zip.file(filename, blob);
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to download ${img.url}`, err);
          } finally {
            completedCount++;
            setDownloadProgress(Math.round((completedCount / selectedImages.length) * 100));
            await processNext(); // Start the next one as soon as this one finishes
          }
        };

        // Start initial batch of workers
        const workers = Array(Math.min(concurrency, selectedImages.length)).fill(null).map(() => processNext());
        await Promise.all(workers);

        if (successCount === 0) {
          throw new Error("Failed to download any images. They might be protected.");
        }

        setStatusMessage("Generating ZIP archive...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `anima_remastered_${safeKeyword}_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Individual downloads - Concurrent queue system
        let successCount = 0;
        let completedCount = 0;
        const concurrency = 10;
        let currentIndex = 0;
        
        const processNext = async (): Promise<void> => {
          if (currentIndex >= selectedImages.length) return;
          
          const index = currentIndex++;
          const img = selectedImages[index];
          
          try {
            let response = await fetch(img.url).catch(() => null);
            if (!response || !response.ok) {
              response = await fetch(`/api/image-proxy?url=${encodeURIComponent(img.url)}`);
            }
            
            if (response && response.ok) {
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const ext = img.url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
              const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              const safeId = img.id.replace(/[^a-z0-9]/gi, '_');
              const timestamp = Date.now();
              a.download = `anima_${safeKeyword}_${safeId}_${timestamp}.${ext}`;
              a.click();
              
              // Cleanup after a short delay to ensure download starts
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to download ${img.url}`, err);
          } finally {
            completedCount++;
            setDownloadProgress(Math.round((completedCount / selectedImages.length) * 100));
            // Small delay to prevent browser from blocking too many simultaneous downloads
            await new Promise(r => setTimeout(r, 100));
            await processNext();
          }
        };

        // Start initial batch of workers
        const workers = Array(Math.min(concurrency, selectedImages.length)).fill(null).map(() => processNext());
        await Promise.all(workers);
      }

      setStatusMessage("Download complete!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to download images.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
      setDownloadProgress(0);
    }
  };

  const totalPages = Math.ceil(allImages.length / imagesPerPage);
  const currentImages = allImages.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);

  const getOptimizedThumbnail = (url: string) => {
    if (!url) return '';
    // Use weserv.nl for fast, resized, webp previews (low quality for speed)
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=300&h=300&fit=cover&output=webp&q=60`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              PFP Anima <span className="text-indigo-600">Remastered</span>
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Next-gen anime asset search powered by DuckDuckGo.
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Link 
            to="/pfp-anima" 
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
          >
            Switch to Classic
          </Link>
        </div>
      </div>

      {/* Search Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 mb-10"
      >
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter character or anime name (e.g. Frieren, Gojo, Aesthetic)..."
              className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none transition-all dark:text-white font-bold text-xl placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !keyword.trim()}
            className="px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Search className="w-6 h-6" /> Search</>}
          </button>
        </form>

        <AnimatePresence>
          {isSearching && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMessage}
                </span>
                <span className="text-sm font-black text-slate-500">{searchProgress}%</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${searchProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800/50 rounded-3xl flex items-start gap-4"
          >
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-600 dark:text-red-400 font-bold">{error}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Results Section */}
      {allImages.length > 0 && (
        <div className="space-y-8">
          {/* Toolbar */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-4 z-30 flex flex-col lg:flex-row items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl gap-5"
          >
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Results</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{allImages.length} <span className="text-slate-400 text-sm font-bold">Images</span></span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected</span>
                <span className="text-xl font-black text-indigo-600">{selectedIds.size} <span className="text-slate-400 text-sm font-bold">Items</span></span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex-wrap justify-center">
                <button
                  onClick={selectAllOnPage}
                  className="px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Select Page
                </button>
                <button
                  onClick={deselectAllOnPage}
                  className="px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Clear Page
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 hidden sm:block"></div>
                <button
                  onClick={selectAllPages}
                  className="px-4 py-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Select All
                </button>
                <button
                  onClick={deselectAllPages}
                  className="px-4 py-2 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Clear All
                </button>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block" />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSelected('zip')}
                  disabled={selectedIds.size === 0 || isDownloading}
                  className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:grayscale flex items-center gap-2 text-sm"
                >
                  {isDownloading && downloadType === 'zip' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {downloadProgress}%</>
                  ) : (
                    <><FileArchive className="w-4 h-4" /> Download ZIP</>
                  )}
                </button>
                <button
                  onClick={() => downloadSelected('individual')}
                  disabled={selectedIds.size === 0 || isDownloading}
                  className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {isDownloading && downloadType === 'individual' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {downloadProgress}%</>
                  ) : (
                    <><Download className="w-4 h-4" /> Individual</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <AnimatePresence mode="popLayout">
              {currentImages.map((img, idx) => {
                const isSelected = selectedIds.has(img.id);
                return (
                  <motion.div 
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (idx % 10) * 0.05 }}
                    onClick={() => toggleSelect(img.id)}
                    className={`group relative aspect-[3/4] rounded-[2rem] overflow-hidden cursor-pointer border-4 transition-all duration-300 ${
                      isSelected 
                        ? 'border-indigo-600 shadow-2xl shadow-indigo-500/40 scale-[0.98]' 
                        : 'border-transparent hover:border-indigo-500/30 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    <img 
                      src={getOptimizedThumbnail(img.thumbnail)} 
                      alt={img.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-all duration-700 ${
                        isSelected ? 'scale-110 brightness-50' : 'group-hover:scale-110'
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.triedThumb) {
                          target.dataset.triedThumb = 'true';
                          target.src = img.thumbnail;
                        } else if (!target.dataset.triedProxy) {
                          target.dataset.triedProxy = 'true';
                          target.src = `/api/image-proxy?url=${encodeURIComponent(img.url)}`;
                        } else if (!target.dataset.triedPlaceholder) {
                          target.dataset.triedPlaceholder = 'true';
                          target.src = `https://picsum.photos/seed/${img.id}/400/600?blur=2`;
                        }
                      }}
                    />
                    
                    {/* Info Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-5 flex flex-col justify-end transition-opacity duration-300 ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded-lg uppercase tracking-widest">
                          {img.width}x{img.height}
                        </span>
                        <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg">
                          <Info className="w-3 h-3" />
                        </div>
                      </div>
                      <p className="text-xs text-white font-bold line-clamp-1 mb-1">
                        {img.title || "Untitled"}
                      </p>
                    </div>

                    {/* Checkbox indicator */}
                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-black/20 border-white/50 backdrop-blur-md'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-10 pb-20">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1 || isDownloading}
                  className="px-6 py-3 text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl disabled:opacity-30 transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" /> Prev
                </button>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="px-6 py-3 text-lg font-black text-slate-900 dark:text-white">
                  {currentPage} <span className="text-slate-400 text-sm font-bold">/ {totalPages}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages || isDownloading}
                  className="px-6 py-3 text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl disabled:opacity-30 transition-all flex items-center gap-2"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && allImages.length === 0 && !error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-32"
        >
          <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[3rem] flex items-center justify-center mx-auto mb-8 border border-slate-200 dark:border-slate-800">
            <ImageIcon className="w-16 h-16 text-slate-300" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Start your search</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mx-auto font-medium">
            Enter a keyword above to find the perfect anime profile pictures and wallpapers.
          </p>
        </motion.div>
      )}
    </div>
  );
}
