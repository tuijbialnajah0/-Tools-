import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, Search, Download, Image as ImageIcon, Filter, CheckCircle2, AlertCircle, ExternalLink, Loader2, Layers } from "lucide-react";
import { supabase } from "../lib/supabase";
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
  const { user, updateUser } = useAuth();
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
  
  const [filterSource, setFilterSource] = useState<string>("All");
  const [filterOrientation, setFilterOrientation] = useState<string>("All");

  const creditCost = 20;

  const animeCharacters = [
    "Frieren", "Fern", "Stark", "Himmel", "Eisen", "Heiter",
    "Marin Kitagawa", "Zero Two", "Rem", "Mikasa Ackerman", "Nezuko Kamado",
    "Hatsune Miku", "Power", "Makima", "Megumin", "Aqua", "Asuka Langley",
    "Rei Ayanami", "Saber", "Tohru", "Kaguya Shinomiya", "Chika Fujiwara",
    "Yor Forger", "Anya Forger", "Lucy (Cyberpunk)", "Rebecca (Cyberpunk)"
  ];

  const [searchCache, setSearchCache] = useState<Record<string, ImageData[]>>({});
  const [showFrierenWarning, setShowFrierenWarning] = useState(false);

  const handleSearch = async (e?: React.FormEvent, isLoadMore = false, bypassWarning = false) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    if (!bypassWarning && keyword.toLowerCase().includes("frieren")) {
      setShowFrierenWarning(true);
      return;
    }

    if (!isLoadMore && searchCache[keyword]) {
      setImages(searchCache[keyword]);
      return;
    }

    setIsSearching(true);
    setSearchProgress(0);
    setError(null);
    
    if (!isLoadMore) {
      setImages([]);
      setPage(1);
    }
    
    const currentPage = isLoadMore ? page + 1 : 1;
    const fullKeyword = keyword.trim();
    
    setStatusMessage(isLoadMore ? "Fetching more results..." : "browsing...");

    const fetchPage = async (p: number) => {
      const searchUrl = `/api/search-images?q=${encodeURIComponent(fullKeyword)}&page=${p}&nsfw=1`;
      const res = await fetch(searchUrl);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch results (${res.status})`);
      }
      return res.json();
    };

    try {
      setSearchProgress(20);
      
      let allResults: ImageData[] = [];
      const seenLinks = new Set<string>(isLoadMore ? images.map(img => img.url) : []);

      // Fetch 2 pages on initial search and on load more
      const pagesToFetch = isLoadMore ? [currentPage, currentPage + 1] : [1, 2];
      
      for (let i = 0; i < pagesToFetch.length; i++) {
        const p = pagesToFetch[i];
        setStatusMessage(`browsing page ${p}...`);
        const data = await fetchPage(p);
        
        let pageResults: ImageData[] = [];
        if (data.data && data.data.results) {
          const apiResults = data.data.results || [];
          apiResults.forEach((item: any, idx: number) => {
            if (item.image && !seenLinks.has(item.image)) {
              seenLinks.add(item.image);
              pageResults.push({
                id: `${data.source}-${p}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                url: item.image,
                thumbnail: item.thumbnail || item.image,
                source: item.source || "DuckDuckGo",
                sourceUrl: item.url || item.image,
                title: item.title || "Untitled",
                width: item.width,
                height: item.height
              });
            }
          });
        }
        allResults = [...allResults, ...pageResults];
        setSearchProgress(20 + ((i + 1) / pagesToFetch.length) * 70);
      }

      if (allResults.length === 0 && !isLoadMore) {
        setError("No results found. Try another search.");
      } else {
        const newImages = isLoadMore ? [...images, ...allResults] : allResults;
        setImages(newImages);
        if (!isLoadMore) {
          setSearchCache(prev => ({ ...prev, [keyword]: allResults }));
        }
        setPage(isLoadMore ? currentPage + 1 : 2);
        setHasMore(allResults.length >= 20);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during search.");
    } finally {
      setIsSearching(false);
      setSearchProgress(100);
      setStatusMessage("");
    }
  };

  const filteredImages = images.filter(img => {
    if (filterSource !== "All" && img.source !== filterSource) return false;
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
      let response = await fetch(img.url).catch(() => null);
      if (!response || !response.ok) {
        response = await fetch(`https://corsproxy.io/?${encodeURIComponent(img.url)}`);
      }
      
      if (!response || !response.ok) {
        throw new Error("Failed to fetch image");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
      const a = document.createElement('a');
      a.href = url;
      a.download = `search_result_${img.id}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Log transaction
      if (user) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: -1,
          type: 'download',
          description: `Saved search result: ${img.title.substring(0, 50)}...`
        });
      }
    } catch (err) {
      console.error("Failed to save result info:", err);
      alert("Failed to download image. It might be protected by CORS.");
    }
  };

  const generateDataset = async () => {
    if (!user) return;
    if (user.credit_balance < creditCost) {
      setError("Insufficient credits.");
      return;
    }

    const resultsToDownload = filteredImages.slice(0, selectedCount);
    if (resultsToDownload.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      let successCount = 0;
      
      let linksList = "DUCKDUCKGO SEARCH RESULTS DATASET\n";
      linksList += `Query: ${keyword}\n`;
      linksList += `Date: ${new Date().toLocaleString()}\n\n`;

      const concurrency = 5;
      for (let i = 0; i < resultsToDownload.length; i += concurrency) {
        const chunk = resultsToDownload.slice(i, i + concurrency);
        
        await Promise.all(chunk.map(async (img, idx) => {
          const globalIdx = i + idx;
          try {
            let response = await fetch(img.url).catch(() => null);
            if (!response || !response.ok) {
              response = await fetch(`https://corsproxy.io/?${encodeURIComponent(img.url)}`);
            }
            
            if (response && response.ok) {
              const blob = await response.blob();
              const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
              // Use a clean filename
              const filename = `result_${String(globalIdx + 1).padStart(3, '0')}.${ext}`;
              zip.file(filename, blob);
              
              const content = `Result #${globalIdx + 1}\nTitle: ${img.title}\nURL: ${img.url}\n\n`;
              linksList += content;
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to download ${img.url}`, err);
          }
        }));
        
        setDownloadProgress(Math.round(((i + chunk.length) / resultsToDownload.length) * 100));
      }
      
      zip.file('all_links.txt', linksList);

      if (successCount === 0) {
        throw new Error("Failed to collect any results.");
      }

      setStatusMessage("Zipping files...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          credit_balance: user.credit_balance - creditCost,
          total_spent: (user.total_spent || 0) + creditCost
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      
      updateUser({ 
        credit_balance: user.credit_balance - creditCost,
        total_spent: (user.total_spent || 0) + creditCost
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_web_dataset.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatusMessage(`Successfully collected ${successCount} results!`);
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
    // We use a relatively small size (300px) and low quality (50) to ensure fast loading
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=300&h=300&fit=cover&output=webp&q=50`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            <Layers className="w-8 h-8 mr-3 text-indigo-600" />
            Image Dataset Collector
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Search and download large image datasets from multiple public sources.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search for anime, characters, cosplay, pfps..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white font-medium text-lg"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !keyword.trim()}
            className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : "Search"}
          </button>
        </form>

        <div className="mt-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
            Popular Anime Characters
          </label>
          <div className="flex flex-wrap gap-2">
            {animeCharacters.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => {
                  setKeyword(char);
                  // Use a timeout to ensure state is updated before search
                  setTimeout(() => handleSearch(undefined, false, false), 0);
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800"
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {isSearching && (
          <div className="mt-6">
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
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start">
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
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div key={img.id} className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img 
                    src={getOptimizedThumbnail(img.thumbnail)} 
                    alt={img.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                        className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Download className="w-3 h-3 mr-1" /> Save
                      </button>
                      <a 
                        href={img.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-colors flex items-center justify-center"
                        title="Open Source"
                      >
                        <ExternalLink className="w-3 h-3" />
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
      {/* Frieren Warning Modal */}
      {showFrierenWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Warning!</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              She is <span className="font-bold text-indigo-600">Tuijbialnajah's</span> waifu , be careful  😾🔪
            </p>
            <button
              onClick={() => {
                setShowFrierenWarning(false);
                handleSearch(undefined, false, true);
              }}
              className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
            >
              I understand, I'll be careful
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
