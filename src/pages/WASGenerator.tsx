import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Search, Download, AlertCircle, CheckCircle2, Loader2, Package, Check, X } from "lucide-react";
import JSZip from "jszip";

interface ImageData {
  id: string;
  url: string;
  source: string;
}

interface StickerPack {
  name: string;
  url: string;
  count: number;
}

export function WASGenerator() {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [processedImages, setProcessedImages] = useState<{ id: string; blob: Blob; previewUrl: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  
  const [packName, setPackName] = useState("My Sticker Pack");
  const [maxPacks, setMaxPacks] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPacks, setGeneratedPacks] = useState<StickerPack[]>([]);

  useEffect(() => {
    const maxAllowed = Math.max(1, Math.ceil(processedImages.length / 30));
    if (maxPacks > maxAllowed) {
      setMaxPacks(maxAllowed);
    }
  }, [processedImages.length, maxPacks]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      generatedPacks.forEach(pack => URL.revokeObjectURL(pack.url));
      processedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [generatedPacks, processedImages]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsSearching(true);
    setError(null);
    setImages([]);
    setSelectedImageIds(new Set());
    setProcessedImages([]);
    setGeneratedPacks([]);
    setStatusMessage("Searching high-quality sources...");

    const fetchWithProxy = async (url: string, timeoutMs = 10000) => {
      const fetchWithTimeout = async (targetUrl: string) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(targetUrl, { signal: controller.signal });
          clearTimeout(id);
          return res;
        } catch (e) {
          clearTimeout(id);
          return null;
        }
      };

      try {
        const res = await fetchWithTimeout(url);
        if (res && res.ok) return res;
      } catch (e) {}
      
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`
      ];
      
      for (const proxy of proxies) {
        const res = await fetchWithTimeout(proxy);
        if (res && res.ok) return res;
      }
      return null;
    };

    try {
      const results: ImageData[] = [];
      const seenHashes = new Set<string>();

      const addResult = (item: ImageData) => {
        // Normalize URL for hashing
        let hash = item.url.split('?')[0].toLowerCase().trim();
        
        // Extract MD5 from URL if present (common in booru sites)
        const md5Match = item.url.match(/([a-f0-9]{32})/i);
        if (md5Match) {
          hash = md5Match[1].toLowerCase();
        }

        // Additional check for duplicate filenames
        const fileName = item.url.split('/').pop()?.split('?')[0].toLowerCase();
        
        if (!seenHashes.has(hash) && !seenHashes.has(fileName || '')) {
          seenHashes.add(hash);
          if (fileName) seenHashes.add(fileName);
          results.push(item);
        }
      };

      const fetchPromises = [];
      let completedSources = 0;
      const totalSources = 4;

      const updateSearchStatus = () => {
        completedSources++;
        const currentProgress = Math.round((completedSources / totalSources) * 100);
        setProgress(currentProgress);
        setStatusMessage(`Searching across multiple sources... (${completedSources}/${totalSources} completed)`);
      };
      
      // Refined search terms for higher quality (Pinterest style)
      const baseQuery = keyword.trim();
      const aestheticQuery = `${baseQuery} aesthetic pinterest trending high quality`;
      
      // 1. Pinterest (via Bing Images)
      fetchPromises.push((async () => {
        try {
          const searchUrl = `https://www.bing.com/images/search?q=pinterest+${encodeURIComponent(baseQuery)}+aesthetic`;
          const res = await fetchWithProxy(searchUrl);
          if (res && res.ok) {
            const text = await res.text();
            const regex = /murl&quot;:&quot;(.*?)&quot;.*?turl&quot;:&quot;(.*?)&quot;/g;
            let match;
            let idx = 0;
            while ((match = regex.exec(text)) !== null) {
              const url = match[1].replace(/&amp;/g, '&');
              if (url.includes('pinimg.com') || idx < 15) {
                addResult({ id: `pin-${idx}-${Math.random()}`, url, source: 'Pinterest' });
                idx++;
              }
            }
          }
        } catch (err) { console.error("Pinterest failed", err); }
        finally { updateSearchStatus(); }
      })());

      // 2. Wallhaven API (High Quality)
      fetchPromises.push((async () => {
        try {
          // Search for aesthetic/pfp versions
          const q = `${baseQuery} aesthetic pfp`;
          const res = await fetchWithProxy(`https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(q)}&purity=100&sorting=relevance&per_page=100`);
          if (res && res.ok) {
            const whData = await res.json();
            whData.data?.forEach((item: any) => {
              addResult({ id: `wh-${item.id}`, url: item.path, source: 'Wallhaven' });
            });
          }
          // Also try aesthetic query
          const res2 = await fetchWithProxy(`https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(aestheticQuery)}&purity=100&sorting=random&per_page=100`);
          if (res2 && res2.ok) {
            const whData = await res2.json();
            whData.data?.forEach((item: any) => {
              addResult({ id: `wh2-${item.id}`, url: item.path, source: 'Wallhaven' });
            });
          }
        } catch (err) { console.error("Wallhaven failed", err); }
        finally { updateSearchStatus(); }
      })());

      // 2. Reddit API (Aesthetic & Trending)
      fetchPromises.push((async () => {
        try {
          const subreddits = ['AestheticWallpapers', 'AnimePhoneWallpapers', 'PFP', 'Aesthetic', 'WallpaperCloud'];
          for (const sub of subreddits) {
            const res = await fetchWithProxy(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(baseQuery)}&restrict_sr=1&sort=relevance&limit=50`);
            if (res && res.ok) {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                try {
                  const data = await res.json();
                  data.data?.children?.forEach((child: any) => {
                    const post = child.data;
                    if (post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.jpeg'))) {
                      addResult({ id: `rd-${post.id}`, url: post.url, source: `Reddit r/${sub}` });
                    }
                  });
                } catch (jsonErr) {
                  console.warn(`Reddit JSON parse failed for r/${sub}`);
                }
              } else {
                console.warn(`Reddit returned non-JSON response for r/${sub}`);
              }
            }
          }
        } catch (err) { console.error("Reddit failed", err); }
        finally { updateSearchStatus(); }
      })());

      // 3. Google/Bing Huge Dataset
      fetchPromises.push((async () => {
        try {
          const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(baseQuery)}`;
          const res = await fetchWithProxy(searchUrl);
          if (res && res.ok) {
            const text = await res.text();
            const regex = /murl&quot;:&quot;(.*?)&quot;.*?turl&quot;:&quot;(.*?)&quot;/g;
            let match;
            let idx = 0;
            while ((match = regex.exec(text)) !== null) {
              const url = match[1].replace(/&amp;/g, '&');
              addResult({ id: `google-bing-${idx}-${Math.random()}`, url, source: 'Google Dataset' });
              idx++;
            }
          }
        } catch (err) { console.error("Google Dataset failed", err); }
        finally { updateSearchStatus(); }
      })());


      const searchTimeout = setTimeout(() => {
        setIsSearching(false);
        if (results.length === 0) {
          setError("Search timed out. Please try again with a different keyword.");
        }
      }, 25000); // 25s global search timeout

      await Promise.allSettled(fetchPromises);
      clearTimeout(searchTimeout);

      if (results.length === 0) {
        setError("No images found for this keyword. Try another search.");
      } else {
        setImages(results);
        // Don't auto-select anymore, let user choose
        setSelectedImageIds(new Set());
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "An error occurred while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchAndCropImage = async (url: string): Promise<Blob | null> => {
    const fetchWithTimeout = async (targetUrl: string, timeoutMs = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(id);
        return res;
      } catch (e) {
        clearTimeout(id);
        return null;
      }
    };

    try {
      const res = await fetchWithTimeout(url, 3000);
      if (res && res.ok) {
        const blob = await res.blob();
        return processBlob(blob);
      }

      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`
      ];
      
      for (const proxy of proxies) {
        const res = await fetchWithTimeout(proxy, 5000);
        if (res && res.ok) {
          const blob = await res.blob();
          return processBlob(blob);
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const processBlob = async (blob: Blob): Promise<Blob | null> => {
    const imgUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(imgUrl);
        resolve(null);
      }, 10000);

      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(imgUrl);
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        canvas.toBlob((b) => {
          resolve(b);
        }, 'image/webp', 0.8);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(imgUrl);
        resolve(null);
      };
      img.src = imgUrl;
    });
  };

  const toggleImageSelection = (id: string) => {
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImageIds(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<string>();
    images.forEach(img => newSelected.add(img.id));
    setSelectedImageIds(newSelected);
  };

  const deselectAll = () => {
    setSelectedImageIds(new Set());
  };

  const processSelectedImages = async () => {
    const selectedImages = images.filter(img => selectedImageIds.has(img.id));
    
    if (selectedImages.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setStatusMessage(`Preparing to process ${selectedImages.length} images...`);

    try {
      const processed: { id: string; blob: Blob; previewUrl: string }[] = [];
      const concurrencyLimit = 5; // Reduced concurrency to allow more frequent UI updates
      
      for (let i = 0; i < selectedImages.length; i += concurrencyLimit) {
        const batch = selectedImages.slice(i, i + concurrencyLimit);
        const currentBatchStart = i + 1;
        const currentBatchEnd = Math.min(i + concurrencyLimit, selectedImages.length);
        
        setStatusMessage(`Processing images ${currentBatchStart}-${currentBatchEnd} of ${selectedImages.length}... (${selectedImages.length - currentBatchEnd} remaining)`);
        
        const results = await Promise.all(batch.map(async (img) => {
          const blob = await fetchAndCropImage(img.url);
          if (blob) {
            return { id: img.id, blob, previewUrl: URL.createObjectURL(blob) };
          }
          return null;
        }));
        
        results.forEach(res => {
          if (res) processed.push(res);
        });
        
        setProgress(Math.round((currentBatchEnd / selectedImages.length) * 100));
      }

      if (processed.length === 0) {
        throw new Error("Failed to process any images. They might be protected or unavailable.");
      }

      setProcessedImages(processed);
      setStatusMessage("Processing complete! Review your stickers below.");
    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err.message || "Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeProcessedImage = (id: string) => {
    const img = processedImages.find(i => i.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    setProcessedImages(prev => prev.filter(i => i.id !== id));
  };

  const generateStickers = async () => {
    if (processedImages.length === 0) {
      setError("No processed stickers available.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setStatusMessage("Preparing sticker packs...");

    try {
      const packs: StickerPack[] = [];
      const chunkSize = 30;
      const totalPacksNeeded = Math.ceil(processedImages.length / chunkSize);
      const packsToCreate = Math.min(totalPacksNeeded, maxPacks);
      
      const finalImages = processedImages.slice(0, packsToCreate * chunkSize);

      for (let i = 0; i < finalImages.length; i += chunkSize) {
        const packIndex = Math.floor(i / chunkSize) + 1;
        setStatusMessage(`Creating pack ${packIndex} of ${packsToCreate}...`);
        
        const chunk = finalImages.slice(i, i + chunkSize);
        const zip = new JSZip();
        
        const currentPackName = finalImages.length > chunkSize 
          ? `${packName.trim() || "My Sticker Pack"} Part ${Math.floor(i / chunkSize) + 1}`
          : (packName.trim() || "My Sticker Pack");
          
        zip.file("title.txt", currentPackName);
        zip.file("author.txt", "ͲႮᏆᎫᏴᏆᎪᏞΝΑᎫΑΉ·Kҽɳƈԋσ Aʅʅιαɳƈҽ");
        
        const trayCanvas = document.createElement('canvas');
        trayCanvas.width = 96;
        trayCanvas.height = 96;
        const trayCtx = trayCanvas.getContext('2d');
        
        const trayImg = new Image();
        const trayUrl = chunk[0].previewUrl;
        await new Promise((resolve) => {
          trayImg.onload = resolve;
          trayImg.src = trayUrl;
        });
        
        if (trayCtx) {
          trayCtx.drawImage(trayImg, 0, 0, 96, 96);
          const trayBlob = await new Promise<Blob | null>(res => trayCanvas.toBlob(res, 'image/png'));
          if (trayBlob) zip.file("tray.png", trayBlob);
        }

        for (let j = 0; j < chunk.length; j++) {
          zip.file(`${j + 1}.webp`, chunk[j].blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const customBlob = new Blob([zipBlob], { type: "application/octet-stream" });
        
        packs.push({
          name: currentPackName,
          url: URL.createObjectURL(customBlob),
          count: chunk.length
        });
        
        setProgress(Math.round(((i + chunk.length) / finalImages.length) * 100));
      }

      setGeneratedPacks(packs);
      setStatusMessage("Done!");

    } catch (err: any) {
      console.error("Sticker generation error:", err);
      setError(err.message || "Failed to generate sticker packs. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAll = () => {
    generatedPacks.forEach((pack, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = pack.url;
        a.download = `${pack.name}.wastickers`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 pt-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <Package className="w-8 h-8 mr-3 text-indigo-600" />
              WA ~ S generator
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Search high-quality images and create custom WhatsApp sticker packs.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search for pfp, cosplay, memes..."
              className="w-full pl-12 pr-32 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white font-medium text-lg"
              disabled={isSearching || isProcessing || isGenerating}
            />
            <button
              type="submit"
              disabled={!keyword.trim() || isSearching || isProcessing || isGenerating}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSearching ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching</>
              ) : (
                "Search"
              )}
            </button>
          </form>
          
          {(isSearching || isProcessing || isGenerating) && (
            <div className="mt-6 space-y-4">
              <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-600" />
                  {statusMessage}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {images.length > 0 && processedImages.length === 0 && generatedPacks.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                  <CheckCircle2 className="w-6 h-6 mr-2 text-emerald-500" />
                  Step 1: Select Images ({images.length} found)
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Choose the images you want to turn into stickers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 text-sm font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-4 py-2 text-sm font-medium bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8 max-h-[500px] overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              {images.map((img) => (
                <div 
                  key={img.id}
                  onClick={() => toggleImageSelection(img.id)}
                  className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedImageIds.has(img.id) 
                      ? "border-indigo-600 ring-4 ring-indigo-600/10" 
                      : "border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                  }`}
                >
                  <img 
                    src={img.url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedProxy) {
                        target.dataset.triedProxy = 'true';
                        target.src = `https://corsproxy.io/?${encodeURIComponent(img.url)}`;
                      } else {
                        target.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white px-1 py-0.5 text-center truncate">
                    {img.source}
                  </div>
                  {selectedImageIds.has(img.id) && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-lg">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={processSelectedImages}
              disabled={selectedImageIds.size === 0 || isProcessing}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center text-lg disabled:opacity-50"
            >
              Process {selectedImageIds.size} Selected Image(s)
            </button>
          </div>
        )}

        {processedImages.length > 0 && generatedPacks.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                  <Package className="w-6 h-6 mr-2 text-indigo-600" />
                  Step 2: Review Processed Stickers ({processedImages.length})
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  These are how your stickers will look. Remove any you don't like.
                </p>
              </div>
              <button
                onClick={() => setProcessedImages([])}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Back to Selection
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8 max-h-[500px] overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              {processedImages.map((img) => (
                <div 
                  key={img.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                >
                  <img 
                    src={img.previewUrl} 
                    alt="Sticker Preview" 
                    className="w-full h-full object-contain p-1"
                  />
                  <button
                    onClick={() => removeProcessedImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sticker Pack Name
                  </label>
                  <input
                    type="text"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                    placeholder="e.g., My Awesome Stickers"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Number of Packs (Max {Math.max(1, Math.ceil(processedImages.length / 30))})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, Math.ceil(processedImages.length / 30))}
                    value={maxPacks}
                    onChange={(e) => setMaxPacks(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={processedImages.length < 30}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Ready to Generate</h3>
                <ul className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1 list-disc list-inside">
                  <li><strong>{processedImages.length}</strong> stickers ready.</li>
                  <li>Creating <strong>{Math.min(maxPacks, Math.ceil(processedImages.length / 30))}</strong> pack(s).</li>
                </ul>
              </div>

              <button
                onClick={generateStickers}
                disabled={isGenerating}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center text-lg disabled:opacity-50"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating...</>
                ) : (
                  `Generate ${Math.min(maxPacks, Math.ceil(processedImages.length / 30))} Pack(s)`
                )}
              </button>
            </div>
          </div>
        )}

        {generatedPacks.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <CheckCircle2 className="w-8 h-8 mr-3 text-emerald-500" />
                Step 3: Download Your Packs!
              </h2>
              {generatedPacks.length > 1 && (
                <button
                  onClick={downloadAll}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generatedPacks.map((pack, index) => (
                <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{pack.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{pack.count} stickers</p>
                  </div>
                  <a
                    href={pack.url}
                    download={`${pack.name}.wastickers`}
                    className="p-3 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors"
                    title="Download Pack"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-2">How to install:</h3>
              <ol className="text-sm text-emerald-700 dark:text-emerald-400 space-y-2 list-decimal list-inside">
                <li>Download the .wastickers file(s) above.</li>
                <li>Open the file on your phone using the <strong>Sticker Maker</strong> app.</li>
                <li>Tap "Add to WhatsApp" to start using them!</li>
              </ol>
            </div>
            
            <button
              onClick={() => {
                setGeneratedPacks([]);
                setProcessedImages([]);
                setImages([]);
                setKeyword("");
              }}
              className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
            >
              Start New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
