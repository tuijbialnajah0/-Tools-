import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Search, Download, Image as ImageIcon, Filter, CheckCircle2, AlertCircle, ExternalLink, Loader2, Layers } from "lucide-react";
import JSZip from "jszip";

interface ImageData {
  id: string;
  url: string;
  thumbnail: string;
  source: string;
  sourceUrl: string;
  width?: number;
  height?: number;
  title: string;
}

export function ImageDatasetCollector() {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [images, setImages] = useState<ImageData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCount, setSelectedCount] = useState<number>(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showWaifuWarning, setShowWaifuWarning] = useState(false);
  
  const [filterSource, setFilterSource] = useState<string>("All");
  const [filterOrientation, setFilterOrientation] = useState<string>("All");
  const [filterQuality, setFilterQuality] = useState<string>("Any");
  const [searchCache, setSearchCache] = useState<Record<string, ImageData[]>>({});

  const popularSearches = [
    "Aesthetic Wallpaper", "Minimalist Setup", "Cyberpunk Art", "Nature Photography", "Vintage Architecture",
    "Anime Scenery", "Cozy Room", "Street Photography", "Dark Academia", "Neon City",
    "Concept Art", "Character Design", "Pixel Art", "Watercolor Illustration", "Tattoo Design"
  ];

  const fetchImageBlob = async (url: string): Promise<Blob | null> => {
    try {
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn("Proxy image failed", e);
    }

    // Fallback to wsrv.nl if our backend proxy fails
    try {
      const res = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&q=80`);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn("wsrv.nl fallback failed", e);
    }
    
    return null;
  };

  const handleSearch = async (e?: React.FormEvent, isLoadMore = false) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    const fullKeyword = keyword.trim();

    if (!isLoadMore && searchCache[fullKeyword]) {
      if (fullKeyword.toLowerCase().includes("frieren")) {
        setShowWaifuWarning(true);
      }
      setImages(searchCache[fullKeyword]);
      return;
    }

    if (!isLoadMore && fullKeyword.toLowerCase().includes("frieren")) {
      setShowWaifuWarning(true);
    }

    setIsSearching(true);
    setSearchProgress(0);
    setError(null);
    
    if (!isLoadMore) {
      setImages([]);
      setPage(1);
    }
    
    const currentPage = isLoadMore ? page + 1 : 1;
    setStatusMessage(isLoadMore ? "Fetching more results..." : "Searching images...");

    try {
      setSearchProgress(20);

      // Broaden keyword to include pinterest style for aesthetic results
      const enhancedKeyword = `${fullKeyword} pinterest aesthetic`;
      const searchRes = await fetch(`/api/search-images?q=${encodeURIComponent(enhancedKeyword)}&page=${currentPage}`);
      
      if (!searchRes.ok) {
        const errorData = await searchRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch search results from server.");
      }

      const data = await searchRes.json();
      const results = data.results || [];

      setSearchProgress(90);

      if (results.length === 0) {
        if (!isLoadMore) setError("No results found. Try a different search term.");
        setHasMore(false);
        return;
      }

      const newImages = isLoadMore ? [...images, ...results] : results;
      
      // Deduplicate by URL to ensure no duplicates
      const uniqueImages: ImageData[] = Array.from(
        new Map<string, ImageData>(newImages.map(item => [item.url, item])).values()
      );
      
      setImages(uniqueImages);
      if (!isLoadMore) {
        setSearchCache(prev => ({ ...prev, [fullKeyword]: uniqueImages }));
      }
      setPage(currentPage);
      setHasMore(results.length >= 20);

    } catch (err: any) {
      console.error("Search error details:", err);
      setError(`Search failed: ${err.message || "Unknown error"}. Please try again.`);
    } finally {
      setIsSearching(false);
      setSearchProgress(100);
      setStatusMessage("");
    }
  };

  const filteredImages = images.filter(img => {
    if (filterSource !== "All" && img.source !== filterSource) return false;
    
    // Quality filter
    if (filterQuality === "High (500px+)") {
      if (img.width && img.height && (img.width < 500 || img.height < 500)) return false;
    } else if (filterQuality === "Ultra (1000px+)") {
      if (img.width && img.height && (img.width < 1000 || img.height < 1000)) return false;
    }

    // Exclude irrelevant patterns/designs but keep cosplay and characters
    const excludedTerms = ['pattern', 'texture', 'background', 'logo', 'vector', 'clipart'];
    const titleLower = img.title.toLowerCase();
    if (excludedTerms.some(term => titleLower.includes(term))) return false;

    if (filterOrientation !== "All") {
      if (!img.width || !img.height) return false;
      const ratio = img.width / img.height;
      if (filterOrientation === "Portrait" && ratio >= 1) return false;
      if (filterOrientation === "Landscape" && ratio <= 1) return false;
      if (filterOrientation === "Square" && (ratio < 0.9 || ratio > 1.1)) return false;
    }
    return true;
  });

  const downloadSingleImage = async (img: ImageData) => {
    try {
      setStatusMessage(`Downloading ${img.title.substring(0, 20)}...`);
      const blob = await fetchImageBlob(img.url);
      if (!blob) throw new Error("Could not download image");
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext : 'jpg';
      a.download = `${img.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${img.id}.${safeExt}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage("");
    } catch (err) {
      console.error("Failed to download image:", err);
      setError("Failed to download image. It might be protected.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const generateDataset = async () => {
    const resultsToDownload = filteredImages.slice(0, selectedCount);
    if (resultsToDownload.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      let successCount = 0;
      
      let linksList = "DATASET LINKS\n";
      linksList += `Query: ${keyword}\n`;
      linksList += `Date: ${new Date().toLocaleString()}\n\n`;

      for (let i = 0; i < resultsToDownload.length; i++) {
        const img = resultsToDownload[i];
        try {
          const blob = await fetchImageBlob(img.url);
          if (blob) {
            const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
            const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext : 'jpg';
            zip.file(`image_${i + 1}_${img.id}.${safeExt}`, blob);
            successCount++;
          }
        } catch (e) {
          console.warn(`Failed to download ${img.url}`);
        }
        
        linksList += `Result #${i + 1}\nTitle: ${img.title}\nURL: ${img.url}\n\n`;
        setDownloadProgress(Math.round(((i + 1) / resultsToDownload.length) * 100));
      }
      
      zip.file('all_links.txt', linksList);

      if (successCount === 0) {
        throw new Error("Failed to download any images. They might be protected by CORS.");
      }

      setStatusMessage("Zipping files...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dataset.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatusMessage(`Successfully collected ${successCount} images!`);
      setTimeout(() => setStatusMessage(""), 3000);

    } catch (err: any) {
      console.error("Dataset generation error:", err);
      setError(err.message || "Failed to generate dataset.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const sources = ["All", ...Array.from(new Set(images.map(i => i.source)))];

  const getOptimizedThumbnail = (url: string) => {
    if (!url) return '';
    // Use weserv.nl for fast, resized, webp previews (low quality for speed)
    // We use a relatively small width (400px) and let height adjust automatically to preserve aspect ratio
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp&q=50`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col items-center justify-center text-center pt-8 pb-4">
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-center mb-4">
          <Layers className="w-12 h-12 mr-4 text-indigo-600" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Image Dataset Collector
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
          Search and download high-quality, Pinterest-style aesthetic image datasets from multiple public sources.
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative flex items-center shadow-sm hover:shadow-md transition-shadow rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search for aesthetic images, wallpapers, art..."
            className="w-full pl-16 pr-36 py-5 bg-transparent outline-none dark:text-white font-medium text-lg rounded-full"
          />
          <button
            type="submit"
            disabled={isSearching || !keyword.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
            Popular Searches
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {popularSearches.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => {
                  setKeyword(char);
                  handleSearch();
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {isSearching && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {statusMessage}
              </span>
              <span className="text-sm font-bold text-slate-500">{searchProgress}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${searchProgress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 max-w-2xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quality</label>
                  <select 
                    value={filterQuality}
                    onChange={(e) => setFilterQuality(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm"
                  >
                    <option value="Any">Any Quality</option>
                    <option value="High (500px+)">High (500px+)</option>
                    <option value="Ultra (1000px+)">Ultra (1000px+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Source</label>
                  <select 
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm"
                  >
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Orientation</label>
                  <select 
                    value={filterOrientation}
                    onChange={(e) => setFilterOrientation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm"
                  >
                    <option value="All">All</option>
                    <option value="Landscape">Landscape</option>
                    <option value="Portrait">Portrait</option>
                    <option value="Square">Square</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Download className="w-5 h-5 mr-2 text-indigo-600" />
                Dataset Generator
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dataset Size</label>
                  <select 
                    value={selectedCount}
                    onChange={(e) => setSelectedCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm"
                  >
                    <option value={50}>50 Images</option>
                    <option value={100}>100 Images</option>
                    <option value={250}>250 Images</option>
                    <option value={500}>500 Images</option>
                    <option value={1000}>1000 Images</option>
                  </select>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Available after filters: <strong className="text-indigo-600 dark:text-indigo-400">{filteredImages.length}</strong> images
                </p>

                <button
                  onClick={generateDataset}
                  disabled={isDownloading || filteredImages.length === 0}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {downloadProgress}%
                    </>
                  ) : (
                    "Download Dataset ZIP"
                  )}
                </button>
                
                {statusMessage && (
                  <p className="text-xs text-center font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Results ({filteredImages.length})</h2>
            </div>
            
            <div className="columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4">
              {filteredImages.map((img) => (
                <div key={img.id} className="group relative break-inside-avoid bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                  <img 
                    src={getOptimizedThumbnail(img.thumbnail)} 
                    alt={img.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedThumb) {
                        target.dataset.triedThumb = 'true';
                        target.src = img.thumbnail; // Fallback to original thumbnail if optimized fails
                      } else if (!target.dataset.triedUrl) {
                        target.dataset.triedUrl = 'true';
                        target.src = img.url; // Fallback to full image if thumbnail fails
                      } else if (!target.dataset.triedProxy) {
                        target.dataset.triedProxy = 'true';
                        target.src = `https://corsproxy.io/?${encodeURIComponent(img.url)}`;
                      } else {
                        target.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                      }
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 bg-indigo-600 text-white rounded-md uppercase tracking-wider">
                        {img.source}
                      </span>
                      {img.width && img.height && (
                        <span className="text-[10px] font-medium text-slate-300">
                          {img.width}x{img.height}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white font-medium line-clamp-2 mb-3" title={img.title}>
                      {img.title || "Untitled"}
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => downloadSingleImage(img)}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-full transition-colors flex items-center justify-center shadow-lg"
                      >
                        <Download className="w-4 h-4 mr-1.5" /> Save
                      </button>
                      <a 
                        href={img.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-colors flex items-center justify-center"
                        title="Open Source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {hasMore && filteredImages.length > 0 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleSearch(undefined, true)}
                  disabled={isSearching}
                  className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center shadow-sm"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Load More Results"
                  )}
                </button>
              </div>
            )}
            
            {filteredImages.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No images match your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waifu Warning Modal */}
      {showWaifuWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-pink-200 dark:border-pink-900/50 transform animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-pink-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Warning!
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 font-medium">
                She's Tuijbialnajah's waifu, be careful 😾🔪
              </p>
              <button
                onClick={() => setShowWaifuWarning(false)}
                className="w-full py-4 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
