import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Search, Download, Image as ImageIcon, Filter, AlertCircle, Loader2, Layers, Zap, RefreshCw } from "lucide-react";
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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [showWaifuWarning, setShowWaifuWarning] = useState(false);
  
  const [lowQualityMode, setLowQualityMode] = useState(true);
  const [searchMode, setSearchMode] = useState<"Anime" | "General" | "Mixed">("Anime");
  const [searchSource, setSearchSource] = useState<"All" | "Wallhaven" | "Booru">("All");
  const [filterSource, setFilterSource] = useState<string>("All");
  const [filterOrientation, setFilterOrientation] = useState<string>("All");
  const [filterQuality, setFilterQuality] = useState<string>("Any");
  const [searchCache, setSearchCache] = useState<Record<string, ImageData[]>>({});

  const popularSearches = [
    "Rem Re:Zero", "Emilia Re:Zero", "Mikasa Ackerman", "Hinata Hyuga", "Zero Two",
    "Asuna Yuuki", "Saber Fate", "Megumin", "Raphtalia", "Marin Kitagawa",
    "Yor Forger", "Power Chainsaw Man", "Makima", "Frieren", "Fern Frieren",
    "Nobara Kugisaki", "Nezuko Kamado", "Kaguya Shinomiya", "Hatsune Miku",
    "Lucy Cyberpunk", "Rebecca Cyberpunk", "Raiden Shogun", "Hu Tao", "Kafka Star Rail",
    "March 7th", "Firefly Star Rail", "Acheron Star Rail", "Robin Star Rail",
    "Goku", "Luffy", "Naruto", "Ichigo", "Saitama", "Tanjiro", "Eren Yeager"
  ];

  const animeCategories = [
    { name: "Popular Waifus", items: ["Rem", "Zero Two", "Asuna", "Mikasa", "Hinata", "Saber", "Megumin"] },
    { name: "Trending", items: ["Frieren", "Fern", "Stark", "Marcille", "Laios", "Maomao", "Jinshi"] },
    { name: "Action/Shonen", items: ["Goku", "Luffy", "Naruto", "Ichigo", "Saitama", "Tanjiro", "Eren"] },
    { name: "Genshin/Star Rail", items: ["Raiden Shogun", "Hu Tao", "Furina", "Kafka", "Firefly", "Acheron"] },
    { name: "Classic", items: ["Sailor Moon", "Rei Ayanami", "Asuka Langley", "Motoko Kusanagi", "Faye Valentine"] }
  ];

  const getThumbnailUrl = (img: ImageData) => {
    if (!lowQualityMode) return `https://wsrv.nl/?url=${encodeURIComponent(img.thumbnail)}&output=webp&q=90`;
    
    // Use a more resilient thumbnail proxy chain
    const encodedUrl = encodeURIComponent(img.thumbnail);
    return `https://wsrv.nl/?url=${encodedUrl}&w=400&h=400&fit=cover&output=webp&q=70&errorredirect=https%3A%2F%2Fimages.weserv.nl%2F%3Furl%3D${encodedUrl}%26w%3D400%26h%3D400%26fit%3Dcover`;
  };

  const fetchImageBlob = async (url: string): Promise<Blob | null> => {
    // Try multiple proxies for maximum resilience with different configurations
    const proxies = [
      (u: string) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&output=webp&q=90`,
      (u: string) => `https://images.weserv.nl/?url=${encodeURIComponent(u.replace(/^https?:\/\//, ''))}&output=webp`,
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`
    ];

    for (const proxyFn of proxies) {
      try {
        const proxyUrl = proxyFn(url);
        const res = await fetch(proxyUrl, { 
          cache: 'no-cache',
          headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });
        
        if (res.ok) {
          const blob = await res.blob();
          // Check if it's a valid image blob (not a tiny placeholder or error text)
          if (blob.size > 2000 && blob.type.startsWith('image/')) {
            return blob;
          }
        }
      } catch (e) {
        console.warn(`Proxy failed for ${url}:`, e);
      }
    }
    
    return null;
  };

  const fetchWithProxy = async (url: string, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res = await fetch(url, { signal: controller.signal }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: controller.signal }).catch(() => null);
      }
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      return null;
    }
  };

  const fetchWithTimeout = async (resource: string, options: any = {}) => {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  const extractImagesFromUrl = async (url: string) => {
    setIsSearching(true);
    setSearchProgress(10);
    setError(null);
    setImages([]);
    setPage(1);
    setStatusMessage("Fetching webpage...");

    try {
      // Use multiple proxies to bypass CORS
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];

      let html = "";
      let fetchSuccess = false;

      for (const proxyUrl of proxies) {
        try {
          const res = await fetchWithTimeout(proxyUrl, { timeout: 15000 });
          if (res.ok) {
            html = await res.text();
            fetchSuccess = true;
            break;
          }
        } catch (e) {
          console.warn(`Proxy failed for ${proxyUrl}:`, e);
        }
      }
      
      if (!fetchSuccess) throw new Error("Failed to fetch the webpage.");
      
      setSearchProgress(40);
      setStatusMessage("Parsing images...");
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      const imgTags = Array.from(doc.querySelectorAll('img'));
      
      const extractedImages: ImageData[] = [];
      const seenUrls = new Set<string>();
      
      setSearchProgress(60);
      
      const baseUrl = new URL(url);
      
      for (const img of imgTags) {
        let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
        
        if (!src) continue;
        
        // Handle relative URLs
        if (src.startsWith('//')) {
          src = `${baseUrl.protocol}${src}`;
        } else if (src.startsWith('/')) {
          src = `${baseUrl.origin}${src}`;
        } else if (!src.startsWith('http') && !src.startsWith('data:image')) {
          src = `${baseUrl.origin}/${src}`;
        }
        
        // Skip tiny icons or tracking pixels
        if (src.includes('favicon') || src.includes('icon') || src.includes('tracking')) continue;
        
        if (!seenUrls.has(src)) {
          seenUrls.add(src);
          extractedImages.push({
            id: `ext-${Math.random().toString(36).substring(7)}`,
            url: src,
            thumbnail: src,
            source: "Web Extraction",
            sourceUrl: url,
            title: img.getAttribute('alt') || "Extracted Image",
          });
        }
      }
      
      // Deep Extraction for JS-heavy sites (like Pinterest)
      if (url.includes('pinterest.com') || url.includes('pinimg.com')) {
        setStatusMessage("Deep scanning for Pinterest images...");
        // Match Pinterest image URLs hidden in JSON/JS
        const pinImgRegex = /https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|474x|236x)\/[a-f0-9]+\/[a-f0-9]+\/[a-f0-9]+\/[a-f0-9a-f]+\.(?:jpg|jpeg|png|webp|gif)/gi;
        const matches = html.match(pinImgRegex);
        
        if (matches) {
          matches.forEach(match => {
            // Prefer 'originals' for highest quality
            let highResUrl = match.replace(/\/(?:736x|564x|474x|236x)\//, '/originals/');
            if (!seenUrls.has(highResUrl)) {
              seenUrls.add(highResUrl);
              extractedImages.push({
                id: `ext-pin-${Math.random().toString(36).substring(7)}`,
                url: highResUrl,
                thumbnail: match,
                source: "Pinterest Extraction",
                sourceUrl: url,
                title: "Pinterest Image",
              });
            }
          });
        }
      } else {
        // Generic deep extraction for other sites (look for image URLs in scripts)
        const genericImgRegex = /(https?:\/\/[^"'\s>]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
        const genericMatches = html.match(genericImgRegex);
        
        if (genericMatches) {
          genericMatches.forEach(match => {
            // Filter out obvious garbage
            const lowerMatch = match.toLowerCase();
            if (lowerMatch.includes('favicon') || lowerMatch.includes('icon') || lowerMatch.includes('avatar') || lowerMatch.includes('profile') || lowerMatch.includes('logo')) return;
            
            if (!seenUrls.has(match)) {
              seenUrls.add(match);
              extractedImages.push({
                id: `ext-gen-${Math.random().toString(36).substring(7)}`,
                url: match,
                thumbnail: match,
                source: "Deep Extraction",
                sourceUrl: url,
                title: "Extracted Image",
              });
            }
          });
        }
      }
      
      setSearchProgress(90);
      
      if (extractedImages.length === 0) {
        setError("No images found on this page. Note: Some sites (like Pinterest, Google Images) block direct extraction or use JavaScript to load images.");
      } else {
        setImages(extractedImages);
        setSelectedImageIds(new Set(extractedImages.slice(0, selectedCount).map(img => img.id)));
      }
      
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError("Failed to extract images. The site might be blocking access or requires JavaScript.");
    } finally {
      setIsSearching(false);
      setSearchProgress(100);
      setStatusMessage("");
    }
  };

  const handleSearch = async (e?: React.FormEvent, isLoadMore = false) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    const fullKeyword = keyword.trim();
    const query = fullKeyword;
    const lowerQuery = query.toLowerCase();

    // Check if it's a URL
    if (lowerQuery.startsWith('http://') || lowerQuery.startsWith('https://')) {
      await extractImagesFromUrl(fullKeyword);
      return;
    }

    const cacheKey = `${fullKeyword}-${searchMode}-${searchSource}`;

    if (!isLoadMore && searchCache[cacheKey]) {
      if (lowerQuery.includes("frieren")) {
        setShowWaifuWarning(true);
      }
      setImages(searchCache[cacheKey]);
      return;
    }

    if (!isLoadMore && lowerQuery.includes("frieren")) {
      setShowWaifuWarning(true);
    }

    setIsSearching(true);
    setSearchProgress(0);
    setError(null);
    
    if (!isLoadMore) {
      setImages([]);
      setPage(1);
      setIsFromCache(false);
    }
    
    const currentPage = isLoadMore ? page + 1 : 1;
    setStatusMessage(isLoadMore ? "Fetching more results..." : "Searching images...");

    try {
      setSearchProgress(10);

      const isCosplaySearch = lowerQuery.includes("cosplay") || lowerQuery.includes("real life") || lowerQuery.includes("photo") || lowerQuery.includes("model");
      
      // Smart tag construction
      const formattedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
      const encodedQuery = encodeURIComponent(formattedQuery);
      
      let allResults: ImageData[] = [];

      // Parallel Search Strategy - Optimized for Speed and Variety
      const searchPromises = [];

      // Source: Wallhaven (General/Anime)
      if (searchSource === "All" || searchSource === "Wallhaven") {
        searchPromises.push(
          (async () => {
            try {
              const purity = searchMode === "Anime" ? "100" : "110"; // 100=SFW, 110=SFW+Sketchy
              const category = searchMode === "Anime" ? "010" : "111"; // 010=Anime, 111=All
              const res = await fetchWithProxy(`https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}&purity=${purity}&categories=${category}&sorting=relevance&page=${currentPage}`);
              if (res && res.ok) {
                const data = await res.json();
                if (data && data.data) {
                  return data.data.map((img: any) => ({
                    id: `wh-${img.id}`,
                    url: img.path,
                    thumbnail: img.thumbs.large || img.thumbs.original,
                    source: 'Wallhaven',
                    sourceUrl: img.url,
                    width: img.resolution.split('x')[0],
                    height: img.resolution.split('x')[1],
                    title: `Wallhaven ${img.id}`,
                    type: searchMode === "Anime" ? 'Anime/Art' : 'General'
                  }));
                }
              }
            } catch (e) {
              console.warn("Wallhaven failed", e);
            }
            return [];
          })()
        );
      }

      // Source: Safebooru (Anime only)
      if ((searchSource === "All" || searchSource === "Booru") && searchMode === "Anime") {
        searchPromises.push(
          (async () => {
            try {
              const res = await fetchWithProxy(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=40&pid=${currentPage - 1}&tags=${encodeURIComponent('*' + query.replace(/\s+/g, '_') + '*')}`);
              if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  return data.map((img: any) => ({
                    id: `sb-${img.id}`,
                    url: `https://safebooru.org/images/${img.directory}/${img.image}`,
                    thumbnail: `https://safebooru.org/thumbnails/${img.directory}/thumbnail_${img.image.replace(/\.[^/.]+$/, "")}.jpg`,
                    source: 'Safebooru',
                    sourceUrl: `https://safebooru.org/index.php?page=post&s=view&id=${img.id}`,
                    width: img.width,
                    height: img.height,
                    title: `Safebooru ${img.id}`,
                    type: 'Anime/Art'
                  }));
                }
              }
            } catch (e) {
              console.warn("Safebooru failed", e);
            }
            return [];
          })()
        );
      }

      setSearchProgress(50);
      const resultsArray = await Promise.all(searchPromises);
      
      allResults = resultsArray.flat();
      
      setSearchProgress(90);

      if (allResults.length === 0) {
        if (!isLoadMore) setError("No results found. Try a different search term.");
        setHasMore(false);
        return;
      }

      // Deduplicate and Update
      const newImages = isLoadMore ? [...images, ...allResults] : allResults;
      const uniqueImages: ImageData[] = Array.from(
        new Map<string, ImageData>(newImages.map(item => [item.url, item])).values()
      );
      
      setImages(uniqueImages);
      
      // Auto-select based on count
      if (!isLoadMore) {
        const initialSelected = new Set(uniqueImages.slice(0, selectedCount).map(img => img.id));
        setSelectedImageIds(initialSelected);
        setSearchCache(prev => ({ ...prev, [cacheKey]: uniqueImages }));
      } else {
        // If loading more, add new images to selection if we haven't reached the count
        if (selectedImageIds.size < selectedCount) {
          setSelectedImageIds(prev => {
            const next = new Set(prev);
            uniqueImages.slice(0, selectedCount).forEach(img => next.add(img.id));
            return next;
          });
        }
      }

      setPage(currentPage);
      setHasMore(allResults.length >= 20);

    } catch (err: any) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
      setSearchProgress(100);
      setStatusMessage("");
    }
  };

  React.useEffect(() => {
    // Only trigger search if there are already results (meaning a search was performed)
    // or if the keyword is not empty and we're not currently searching
    if (keyword.trim() && images.length > 0 && !isSearching) {
      handleSearch();
    }
  }, [searchMode, searchSource]);

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

  const toggleImageSelection = (id: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedImageIds(new Set(filteredImages.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImageIds(new Set());
  };

  const generateDataset = async () => {
    const resultsToDownload = filteredImages.filter(img => selectedImageIds.has(img.id));
    if (resultsToDownload.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      let successCount = 0;
      let completedCount = 0;
      const total = resultsToDownload.length;
      let currentIndex = 0;
      
      let linksList = "DATASET LINKS\n";
      linksList += `Query: ${keyword}\n`;
      linksList += `Date: ${new Date().toLocaleString()}\n\n`;

      const downloadWorker = async () => {
        while (currentIndex < total) {
          const index = currentIndex++;
          const img = resultsToDownload[index];
          try {
            const blob = await fetchImageBlob(img.url);
            if (blob) {
              const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
              const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext : 'jpg';
              zip.file(`image_${index + 1}_${img.id}.${safeExt}`, blob);
              successCount++;
              linksList += `Result #${index + 1}\nTitle: ${img.title}\nURL: ${img.url}\n\n`;
            } else {
              linksList += `Result #${index + 1} (DOWNLOAD FAILED) - Title: ${img.title} - URL: ${img.url}\n`;
            }
          } catch (e) {
            console.warn(`Failed to download ${img.url}`);
            linksList += `Result #${index + 1} (DOWNLOAD FAILED) - Title: ${img.title} - URL: ${img.url}\n`;
          }
          
          completedCount++;
          setStatusMessage(`Downloading... (${completedCount}/${total})`);
          setDownloadProgress(Math.round((completedCount / total) * 100));
        }
      };

      const concurrency = Math.min(10, total);
      const workers = Array.from({ length: concurrency }, () => downloadWorker());
      await Promise.all(workers);
      
      zip.file('all_links.txt', linksList);

      if (successCount === 0) {
        throw new Error("Failed to download any images. This is likely due to strict CORS protections on the source websites. We've tried multiple proxies, but some images are still blocked.");
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

  const downloadIndividually = async () => {
    const resultsToDownload = filteredImages.filter(img => selectedImageIds.has(img.id));
    if (resultsToDownload.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      let successCount = 0;
      let completedCount = 0;
      const total = resultsToDownload.length;
      let currentIndex = 0;
      
      const downloadWorker = async () => {
        while (currentIndex < total) {
          const index = currentIndex++;
          const img = resultsToDownload[index];
          try {
            const blob = await fetchImageBlob(img.url);
            if (blob) {
              const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
              const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext : 'jpg';
              
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${img.id}.${safeExt}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              successCount++;
              
              // Small delay to prevent browser from blocking multiple downloads
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (e) {
            console.warn(`Failed to download ${img.url}`);
          }
          
          completedCount++;
          setStatusMessage(`Downloading... (${completedCount}/${total})`);
          setDownloadProgress(Math.round((completedCount / total) * 100));
        }
      };

      const concurrency = Math.min(10, total);
      const workers = Array.from({ length: concurrency }, () => downloadWorker());
      await Promise.all(workers);

      if (successCount === 0) {
        throw new Error("Failed to download any images. This is likely due to strict CORS protections on the source websites.");
      }

      setStatusMessage(`Successfully downloaded ${successCount} images!`);
      setTimeout(() => setStatusMessage(""), 3000);

    } catch (err: any) {
      console.error("Individual download error:", err);
      setError(err.message || "Failed to download images.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const sources = ["All", ...Array.from(new Set(images.map(i => i.source)))];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col items-center justify-center text-center pt-8 pb-4">
        
        <div className="flex items-center justify-center mb-4">
          <Layers className="w-12 h-12 mr-4 text-indigo-600" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Image Dataset Collector <span className="text-sm font-normal text-slate-400 align-middle ml-2">v1.2.0</span>
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
          Search and download high-quality <b>image datasets</b>. Optimized for Anime, Real Life, and General Assets.
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 flex items-center shadow-sm hover:shadow-md transition-shadow rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search tags, characters, or paste URL..."
                className="w-full pl-12 pr-4 py-4 md:pl-16 md:pr-6 md:py-5 bg-transparent outline-none dark:text-white font-medium text-base md:text-lg rounded-full"
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
              <select
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value as any)}
                className="flex-1 sm:flex-none min-w-[130px] px-4 py-4 md:px-6 md:py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none dark:text-white font-medium text-sm md:text-base shadow-sm hover:shadow-md transition-shadow cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em', paddingRight: '2.5rem' }}
              >
                <option value="All">All Sources</option>
                <option value="Wallhaven">Wallhaven</option>
                <option value="Booru">Booru</option>
              </select>

              <button
                type="submit"
                disabled={isSearching || !keyword.trim()}
                className="w-full sm:w-auto px-6 py-4 md:px-8 md:py-5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-500/20 whitespace-nowrap text-base"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isSearching ? "Searching" : "Search"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Lightning Fast</span>
          </div>
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-indigo-500" />
            <span>High Quality</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-500" />
            <span>Dataset Ready</span>
          </div>
        </div>

        <div className="mt-8">
            <div className="space-y-6">
              {animeCategories.map((cat) => (
                <div key={cat.name} className="text-center">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest">
                    {cat.name}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
                    {cat.items.map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => {
                          setKeyword(char);
                          handleSearch();
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-sm"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
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

        {!isSearching && keyword && images.length === 0 && !error && (
          <div className="mt-12 text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm max-w-4xl mx-auto">
            <div className="mb-6 flex justify-center">
              <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                <Search className="w-12 h-12 text-amber-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No results found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto px-4 mb-8">
              We couldn't find any images for "{keyword}". Try using broader terms or different tags.
            </p>
            <button
              onClick={() => handleSearch()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Search
            </button>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Download className="w-5 h-5 mr-2 text-indigo-600" />
                Dataset Generator
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quick Select</label>
                  <select 
                    value={selectedCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setSelectedCount(count);
                      setSelectedImageIds(new Set(filteredImages.slice(0, count).map(img => img.id)));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-sm"
                  >
                    <option value={50}>First 50 Images</option>
                    <option value={100}>First 100 Images</option>
                    <option value={250}>First 250 Images</option>
                    <option value={500}>First 500 Images</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={selectAll}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={deselectAll}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selected: <strong className="text-indigo-600 dark:text-indigo-400">{selectedImageIds.size}</strong> / {filteredImages.length} images
                </p>

                <div className="flex flex-col gap-3">
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

                  <button
                    onClick={downloadIndividually}
                    disabled={isDownloading || filteredImages.length === 0}
                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        {downloadProgress}%
                      </>
                    ) : (
                      "Download All (Individual)"
                    )}
                  </button>
                </div>
                
                {statusMessage && (
                  <p className="text-xs text-center font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Image Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Search Results ({filteredImages.length})
                </h2>
                {isFromCache && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200">
                    Cached
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateDataset}
                  disabled={isDownloading || selectedImageIds.size === 0}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {downloadProgress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      ZIP ({selectedImageIds.size})
                    </>
                  )}
                </button>
                <button
                  onClick={downloadIndividually}
                  disabled={isDownloading || selectedImageIds.size === 0}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {downloadProgress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Individual ({selectedImageIds.size})
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div 
                  key={img.id}
                  onClick={() => toggleImageSelection(img.id)}
                  className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIds.has(img.id) 
                      ? 'border-indigo-500 ring-4 ring-indigo-500/20' 
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <img 
                    src={getThumbnailUrl(img)} 
                    alt={img.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback for broken thumbnails - try our backend proxy
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedProxy) {
                        target.dataset.triedProxy = 'true';
                        target.src = `https://wsrv.nl/?url=${encodeURIComponent(img.thumbnail)}&output=webp&q=70`;
                      } else {
                        // Don't show random picsum images, just show a broken image placeholder
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBhdGggZD0iTTIxIDE1bC01LTVMNSAyMSI+PC9wYXRoPjwvc3ZnPg==';
                        target.className = "w-full h-full object-cover opacity-50 p-8";
                      }
                    }}
                  />
                  
                  <div className={`absolute inset-0 bg-indigo-600/10 transition-opacity ${selectedImageIds.has(img.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  
                  {/* Source Tag */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <span className="px-1.5 py-0.5 bg-black/60 text-white text-[8px] font-bold rounded backdrop-blur-sm">
                      {img.source}
                    </span>
                    {(img as any).type && (
                      <span className={`px-1.5 py-0.5 text-white text-[8px] font-bold rounded backdrop-blur-sm ${
                        (img as any).type === 'Cosplay' ? 'bg-pink-600/80' : 
                        (img as any).type === 'Anime/Art' ? 'bg-indigo-600/80' : 'bg-slate-600/80'
                      }`}>
                        {(img as any).type}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 right-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedImageIds.has(img.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white/80 border-slate-300 text-transparent'
                    }`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate font-medium">{img.source}</p>
                    {img.width && img.height && (
                      <p className="text-[10px] text-white/80">{img.width}x{img.height}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && filteredImages.length > 0 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleSearch(undefined, true)}
                  disabled={isSearching}
                  className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center shadow-sm"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading more...
                    </>
                  ) : (
                    "Load More Images"
                  )}
                </button>
              </div>
            )}
            
            {filteredImages.length === 0 && !isSearching && (
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
