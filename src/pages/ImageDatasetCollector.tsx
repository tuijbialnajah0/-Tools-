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
  const [inputValue, setInputValue] = useState("");
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [showWaifuWarning, setShowWaifuWarning] = useState(false);
  
  const [lowQualityMode, setLowQualityMode] = useState(true);
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
    const lowerUrl = img.url.toLowerCase();
    const isGif = lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?') || lowerUrl.includes('giphy.com/media/') || lowerUrl.includes('media.tenor.com/');
    
    // Proxy sharding to bypass browser concurrent request limits
    const subdomains = ['a', 'b', 'c'];
    const shard = subdomains[Math.abs(img.id.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % subdomains.length];
    const baseUrl = `https://${shard}.wsrv.nl/`;
    const encodedUrl = encodeURIComponent(img.url);

    // Use proxy for all images to bypass hotlinking protection
    if (!lowQualityMode) {
      if (isGif) return `${baseUrl}?url=${encodedUrl}&n=-1`;
      return `${baseUrl}?url=${encodedUrl}&output=webp&q=80&w=1200`; // High quality but still capped
    }
    
    // Standard mode: 400px is plenty for grid thumbnails and loads much faster than 800px
    if (isGif) return `${baseUrl}?url=${encodedUrl}&n=-1&w=400`;
    return `${baseUrl}?url=${encodedUrl}&w=400&fit=cover&output=webp&q=75&errorredirect=https%3A%2F%2Fimages.weserv.nl%2F%3Furl%3D${encodedUrl}%26w%3D400%26fit%3Dcover`;
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

  const fetchWithProxy = async (url: string, timeoutMs = 8000) => {
    const proxies = [
      url, // Direct
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      `https://thingproxy.freeboard.io/fetch/${url}`,
      `https://proxy.cors.sh/${url}`,
    ];

    for (const proxyUrl of proxies) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(proxyUrl, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, text/html, */*'
          }
        });
        if (res && res.ok) {
          clearTimeout(id);
          return res;
        }
      } catch (e) {
        // Continue to next proxy
      } finally {
        clearTimeout(id);
      }
    }
    return null;
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

  const handleSearch = async (e?: React.FormEvent, isLoadMore = false, overrideQuery?: string) => {
    if (e) e.preventDefault();
    
    const searchVal = overrideQuery || (isLoadMore ? keyword : inputValue);
    if (!searchVal.trim()) return;

    const fullKeyword = searchVal.trim();
    if (!isLoadMore) {
      setKeyword(fullKeyword);
      setInputValue(fullKeyword);
    }
    
    const query = fullKeyword;
    const lowerQuery = query.toLowerCase();

    // Check if it's a URL
    if (lowerQuery.startsWith('http://') || lowerQuery.startsWith('https://')) {
      await extractImagesFromUrl(fullKeyword);
      return;
    }

    const cacheKey = `${fullKeyword}`;

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
    setStatusMessage(isLoadMore ? "Fetching more results..." : "Searching");
    setSearchProgress(10);

    try {
      setSearchProgress(10);

      const isCosplaySearch = lowerQuery.includes("cosplay") || lowerQuery.includes("real life") || lowerQuery.includes("photo") || lowerQuery.includes("model");
      
      // Smart tag construction
      const formattedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
      const encodedQuery = encodeURIComponent(formattedQuery);
      
      let allResults: ImageData[] = isLoadMore ? [...images] : [];
      const searchPromises = [];
      const seenUrls = new Set<string>(allResults.map(img => img.url.split('?')[0].replace(/^https?:\/\//, '')));

      // Helper to check relevance
      const searchTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !['the', 'and', 'for', 'with'].includes(w));
      
      const strictExcludedTerms = [
        'gradient', 'solid color', 'blank', 'aesthetic background',
        'ribbon', 'bows', 'frame', 'border', 'template', 'layout', 'palette',
        'pattern', 'texture', 'background', 'logo', 'vector', 'clipart',
        'icon', 'button', 'banner', 'ui ', ' ux ', 'mockup', 'wireframe',
        'color palette', 'swatch', 'color scheme', 'wallpaper background',
        'abstract', 'minimalist', 'geometric', 'shape', 'overlay', 'text box'
      ];

      const isRelevant = (img: ImageData) => {
        const textToSearch = `${img.title} ${img.url} ${img.sourceUrl || ''}`.toLowerCase();
        
        // STRICT EXCLUSION - If any of these terms are in the title or URL, block it immediately
        // if (strictExcludedTerms.some(term => textToSearch.includes(term))) {
        //   return false;
        // }

        if (searchTerms.length === 0) return true;
        
        // Trust strict search engines/sources that filter by tags/subreddits accurately
        const trustedSources = ['Safebooru', 'Flickr', 'Danbooru', 'Gelbooru', 'Konachan', 'Yande.re', 'Realbooru', 'Zerochan', 'MyAnimeList', 'ArtStation', 'Rule34', 'Xbooru', 'DeviantArt', 'Tumblr', 'Pixiv', 'Fandom Wiki', 'Wallhaven', 'WallpaperCave'];
        if (trustedSources.some(src => img.source.includes(src))) return true;
        
        // Check if at least one search term is in the prompt/title/url
        return searchTerms.some(term => textToSearch.includes(term));
      };

      const addResults = (newResults: ImageData[]) => {
        const added: ImageData[] = [];
        newResults.forEach(img => {
          const normalizedUrl = img.url.split('?')[0].replace(/^https?:\/\//, '');
          if (!seenUrls.has(normalizedUrl) && isRelevant(img)) {
            seenUrls.add(normalizedUrl);
            added.push(img);
          }
        });
        
        if (added.length > 0) {
          allResults.push(...added);
          
          const q = query.toLowerCase();
          
          const getRelevanceScore = (img: ImageData) => {
            let score = 0;
            const title = (img.title || '').toLowerCase();
            const url = (img.url || '').toLowerCase();

            // Exact match in title
            if (title.includes(q)) score += 100;
            
            // Exact match in URL
            if (url.includes(q.replace(/\s+/g, '-')) || url.includes(q.replace(/\s+/g, '_'))) score += 50;

            // Term matches
            searchTerms.forEach(term => {
              if (title.includes(term)) score += 10;
              if (url.includes(term)) score += 5;
            });

            return score;
          };

          // Prioritize Anime sources first, then Search Engines, then others
          const getPriority = (source: string) => {
            const animeSources = ['Safebooru', 'Danbooru', 'Gelbooru', 'Konachan', 'Yande.re', 'Zerochan', 'MyAnimeList', 'Realbooru', 'Rule34', 'Xbooru', 'Sankaku'];
            const searchEngines = ['Google', 'Bing', 'DuckDuckGo', 'Yahoo'];
            const lowPrioritySources = ['Alamy', 'iStock', 'Shutterstock', 'Pixiv'];
            
            // If the query contains anime-related terms, boost anime sources to the absolute top
            const isAnimeQuery = query.toLowerCase().match(/anime|manga|cosplay|waifu|husbando|r34|rule34|hentai|nsfw|pov/);
            if (isAnimeQuery && animeSources.some(src => source.includes(src))) return 0; // Highest priority

            if (animeSources.some(src => source.includes(src))) return 1;
            if (searchEngines.some(src => source.includes(src))) return 2;
            if (lowPrioritySources.some(src => source.includes(src))) return 10; // Lowest priority
            return 3;
          };
          
          allResults.sort((a, b) => {
            const priorityA = getPriority(a.source);
            const priorityB = getPriority(b.source);
            
            // If priorities are different, sort by priority first (lower number is better)
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }

            // If priorities are the same, sort by relevance score
            const scoreA = getRelevanceScore(a);
            const scoreB = getRelevanceScore(b);
            return scoreB - scoreA; // Higher score first
          });
          
          setImages([...allResults]);
        }
      };

      // Helper functions for new sources
      const fetchBooru = (name: string, url: string, urlMapper: (item: any) => string, thumbMapper: (item: any) => string, titleMapper: (item: any) => string) => {
        searchPromises.push((async () => {
          try {
            const res = await fetchWithProxy(url);
            if (res && res.ok) {
              const data = await res.json();
              const items = Array.isArray(data) ? data : (data.post || data.items || data.data?.result?.items || (data.query?.pages ? Object.values(data.query.pages) : []));
              const results = items.map((item: any, idx: number) => {
                const imgUrl = urlMapper(item);
                if (!imgUrl) return null;
                return {
                  id: `${name.toLowerCase()}-${idx}-${Math.random().toString(36).substring(7)}`,
                  url: imgUrl,
                  thumbnail: thumbMapper(item) || imgUrl,
                  source: name,
                  sourceUrl: url,
                  title: titleMapper(item) || `${query} - ${name}`
                };
              }).filter(Boolean) as ImageData[];
              addResults(results);
            }
          } catch (e) { console.warn(`${name} failed`, e); }
        })());
      };

      const scrapeRegex = (name: string, url: string, regex: RegExp, urlMapper: (match: RegExpExecArray) => string) => {
        searchPromises.push((async () => {
          try {
            const res = await fetchWithProxy(url);
            if (res && res.ok) {
              const text = await res.text();
              const results: ImageData[] = [];
              let match;
              let idx = 0;
              regex.lastIndex = 0;
              while ((match = regex.exec(text)) !== null && idx < 40) {
                const imgUrl = urlMapper(match);
                if (imgUrl && !imgUrl.includes('favicon') && !imgUrl.includes('logo')) {
                  results.push({
                    id: `${name.toLowerCase()}-${idx}-${Math.random().toString(36).substring(7)}`,
                    url: imgUrl,
                    thumbnail: imgUrl,
                    source: name,
                    sourceUrl: url,
                    title: `${query} - ${name} ${idx + 1}`
                  });
                  idx++;
                }
              }
              addResults(results);
            }
          } catch (e) { console.warn(`${name} failed`, e); }
        })());
      };

      const scrapeBingSite = (sourceName: string, siteUrl: string) => {
        searchPromises.push(
          (async () => {
            try {
              const searchUrl = `https://www.bing.com/images/search?q=site%3a${siteUrl}+${encodeURIComponent(query)}&adlt=off`;
              const res = await fetchWithProxy(searchUrl);
              if (res && res.ok) {
                const text = await res.text();
                const regex = /murl&quot;:&quot;(.*?)&quot;.*?turl&quot;:&quot;(.*?)&quot;/g;
                let match;
                const results: ImageData[] = [];
                let idx = 0;
                while ((match = regex.exec(text)) !== null && idx < 15) {
                  results.push({
                    id: `${sourceName.toLowerCase().replace(/\s+/g, '')}-${idx}-${Math.random().toString(36).substring(7)}`,
                    url: match[1],
                    thumbnail: match[2],
                    source: sourceName,
                    sourceUrl: `https://${siteUrl}`,
                    title: query
                  });
                  idx++;
                }
                addResults(results);
              }
            } catch (e) {
              console.warn(`${sourceName} failed`, e);
            }
          })()
        );
      };

      // 16+ New Sources
      fetchBooru('Danbooru', `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(query)}&limit=40`, i => i.file_url || i.large_file_url, i => i.preview_file_url || i.file_url, i => i.tag_string);
      fetchBooru('Gelbooru', `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&limit=40`, i => i.file_url, i => i.preview_url || i.file_url, i => i.tags);
      fetchBooru('Konachan', `https://konachan.net/post.json?tags=${encodeURIComponent(query)}&limit=40`, i => i.file_url, i => i.preview_url || i.file_url, i => i.tags);
      fetchBooru('Yande.re', `https://yande.re/post.json?tags=${encodeURIComponent(query)}&limit=40`, i => i.file_url, i => i.preview_url || i.file_url, i => i.tags);
      fetchBooru('Realbooru', `https://realbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&limit=40`, i => `https://realbooru.com/images/${i.directory}/${i.image}`, i => `https://realbooru.com/thumbnails/${i.directory}/thumbnail_${i.image}`, i => i.tags);
      fetchBooru('Rule34', `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&limit=40`, i => i.file_url, i => i.preview_url || i.file_url, i => i.tags);
      fetchBooru('Xbooru', `https://xbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}&limit=40`, i => `https://xbooru.com/images/${i.directory}/${i.image}`, i => `https://xbooru.com/thumbnails/${i.directory}/thumbnail_${i.image}`, i => i.tags);
      fetchBooru('Qwant', `https://api.qwant.com/v3/search/images?q=${encodeURIComponent(query)}&count=40`, i => i.media, i => i.thumbnail, i => i.title);
      fetchBooru('Wikimedia', `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=40&prop=imageinfo&iiprop=url&format=json`, i => i.imageinfo?.[0]?.url, i => i.imageinfo?.[0]?.url, i => i.title);
      fetchBooru('ArtStation', `https://www.artstation.com/api/v2/search/projects.json?query=${encodeURIComponent(query)}&page=1&per_page=40`, i => i.cover?.large_image_url, i => i.cover?.small_image_url, i => i.title);
      fetchBooru('Wallhaven', `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}`, i => i.path, i => i.thumbs?.original || i.path, i => i.id);
      fetchBooru('Sankaku', `https://capi-v2.sankakucomplex.com/posts?tags=${encodeURIComponent(query)}&limit=40`, i => i.file_url, i => i.preview_url || i.file_url, i => i.tags);
      
      scrapeRegex('Imgur', `https://imgur.com/search?q=${encodeURIComponent(query)}`, /<img alt="" src="\/\/i\.imgur\.com\/([^"]+)"/g, m => `https://i.imgur.com/${m[1].replace('b.jpg', '.jpg')}`);
      scrapeRegex('Pexels', `https://www.pexels.com/search/${encodeURIComponent(query)}/`, /src="(https:\/\/images\.pexels\.com\/photos\/[^"]+)"/g, m => m[1].split('?')[0]);
      scrapeRegex('Pixabay', `https://pixabay.com/images/search/${encodeURIComponent(query)}/`, /src="(https:\/\/cdn\.pixabay\.com\/photo\/[^"]+)"/g, m => m[1]);
      scrapeRegex('Giphy', `https://giphy.com/search/${encodeURIComponent(query)}`, /href="(https:\/\/giphy\.com\/gifs\/[^"]+)"/g, m => `https://media.giphy.com/media/${m[1].split('-').pop()}/giphy.gif`);
      scrapeRegex('Tenor', `https://tenor.com/search/${encodeURIComponent(query)}-gifs`, /src="(https:\/\/media\.tenor\.com\/[^"]+)"/g, m => m[1]);
      scrapeRegex('Zerochan', `https://www.zerochan.net/${encodeURIComponent(query)}`, /src="(https:\/\/s1\.zerochan\.net\/[^"]+)"/g, m => m[1]);
      scrapeRegex('MyAnimeList', `https://myanimelist.net/search/all?q=${encodeURIComponent(query)}`, /src="(https:\/\/cdn\.myanimelist\.net\/images\/[^"]+)"/g, m => m[1].replace('/r/50x70', '').replace('/r/100x140', ''));

      // Mega Sources Addition (via Bing Site Search)
      scrapeBingSite('DeviantArt', 'deviantart.com');
      scrapeBingSite('Tumblr', 'tumblr.com');
      scrapeBingSite('Pixiv', 'pixiv.net');
      scrapeBingSite('Fandom Wiki', 'fandom.com');
      scrapeBingSite('KnowYourMeme', 'knowyourmeme.com');
      scrapeBingSite('Freepik', 'freepik.com');
      scrapeBingSite('Shutterstock', 'shutterstock.com');
      scrapeBingSite('Getty Images', 'gettyimages.com');
      scrapeBingSite('9GAG', '9gag.com');
      scrapeBingSite('Behance', 'behance.net');
      scrapeBingSite('Dribbble', 'dribbble.com');
      scrapeBingSite('WallpaperCave', 'wallpapercave.com');
      scrapeBingSite('IMDb', 'imdb.com');
      scrapeBingSite('IGN', 'ign.com');
      scrapeBingSite('Vecteezy', 'vecteezy.com');
      scrapeBingSite('Alamy', 'alamy.com');
      scrapeBingSite('iStock', 'istockphoto.com');

      // Source: Pinterest (Direct Scrape via Proxy)
      searchPromises.push(
        (async () => {
          try {
            const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
            const res = await fetchWithProxy(searchUrl, 15000);
            if (res && res.ok) {
              const html = await res.text();
              const pinImgRegex = /https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|474x|236x)\/[a-f0-9]+\/[a-f0-9]+\/[a-f0-9]+\/[a-f0-9a-f]+\.(?:jpg|jpeg|png|webp|gif)/gi;
              const matches = html.match(pinImgRegex);
              if (matches) {
                const results: ImageData[] = [];
                const seenPins = new Set<string>();
                matches.forEach((match, idx) => {
                  const highResUrl = match.replace(/\/(?:736x|564x|474x|236x)\//, '/originals/');
                  if (!seenPins.has(highResUrl)) {
                    seenPins.add(highResUrl);
                    results.push({
                      id: `pin-direct-${idx}-${Math.random().toString(36).substring(7)}`,
                      url: highResUrl,
                      thumbnail: match,
                      source: 'Pinterest',
                      sourceUrl: searchUrl,
                      title: `${query} - Pinterest Pin ${idx + 1}`
                    });
                  }
                });
                addResults(results);
              }
            }
          } catch (e) {
            console.warn("Pinterest direct search failed", e);
          }
        })()
      );

      // Source: Pinterest (via Bing - Enhanced)
      searchPromises.push(
        (async () => {
          try {
            const searchUrl = `https://www.bing.com/images/search?q=site%3apinterest.com+${encodeURIComponent(query)}&adlt=off`;
            const res = await fetchWithProxy(searchUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (res && res.ok) {
              const text = await res.text();
              const regex = /murl&quot;:&quot;(.*?)&quot;.*?turl&quot;:&quot;(.*?)&quot;/g;
              let match;
              const results: ImageData[] = [];
              let idx = 0;
              while ((match = regex.exec(text)) !== null && idx < 60) {
                const url = match[1].replace(/&amp;/g, '&');
                const thumbnail = match[2].replace(/&amp;/g, '&');
                if (url.includes('pinimg.com')) {
                  const highResUrl = url.replace(/\/(?:736x|564x|474x|236x)\//, '/originals/');
                  results.push({
                    id: `pin-bing-${idx}-${Math.random().toString(36).substring(7)}`,
                    url: highResUrl,
                    thumbnail,
                    source: 'Pinterest',
                    sourceUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
                    title: `${query} - Pinterest Image ${idx + 1}`
                  });
                  idx++;
                }
              }
              addResults(results);
            }
          } catch (e) {
            console.warn("Pinterest via Bing failed", e);
          }
        })()
      );

      // Source: Lexica.art (High Quality AI/Art)
      searchPromises.push(
        (async () => {
          try {
            const apiUrl = `https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`;
            const res = await fetchWithProxy(apiUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (!res) return;
            const data = await res.json();
            
            if (data && data.images) {
              const results = data.images.map((img: any) => ({
                id: `lex-${img.id}`,
                url: img.src,
                thumbnail: img.srcSmall || img.src,
                source: 'Lexica',
                sourceUrl: `https://lexica.art/prompt/${img.id}`,
                width: img.width,
                height: img.height,
                title: img.prompt || query,
              }));
              addResults(results);
            }
          } catch (e) {
            console.warn("Lexica API failed", e);
          }
        })()
      );

      // Source: Unsplash (High Quality Photography)
      searchPromises.push(
        (async () => {
          try {
            const apiUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${currentPage}`;
            const res = await fetchWithProxy(apiUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (!res) return;
            const data = await res.json();
            
            if (data && data.results) {
              const results = data.results.map((img: any) => ({
                id: `uns-${img.id}`,
                url: img.urls.regular,
                thumbnail: img.urls.small,
                source: 'Unsplash',
                sourceUrl: img.links.html,
                width: img.width,
                height: img.height,
                title: img.description || img.alt_description || query,
              }));
              addResults(results);
            }
          } catch (e) {
            console.warn("Unsplash API failed", e);
          }
        })()
      );

      // Source: DuckDuckGo (Instant Answer API) + Web Fallback
      searchPromises.push(
        (async () => {
          try {
            const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&kp=-2`;
            const res = await fetchWithProxy(apiUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            const results: ImageData[] = [];
            
            if (res) {
              const data = await res.json();
              if (data.Image) {
                const fullImageUrl = data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`;
                results.push({
                  id: `ddg-ia-main-${Math.random().toString(36).substring(7)}`,
                  url: fullImageUrl,
                  thumbnail: fullImageUrl,
                  source: 'DuckDuckGo',
                  sourceUrl: data.AbstractURL || data.DefinitionURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                  title: data.Heading || query,
                });
              }
              
              if (data.RelatedTopics) {
                data.RelatedTopics.forEach((topic: any, idx: number) => {
                  if (topic.Icon && topic.Icon.URL) {
                    const iconUrl = topic.Icon.URL.startsWith('http') ? topic.Icon.URL : `https://duckduckgo.com${topic.Icon.URL}`;
                    results.push({
                      id: `ddg-ia-rel-${idx}-${Math.random().toString(36).substring(7)}`,
                      url: iconUrl,
                      thumbnail: iconUrl,
                      source: 'DuckDuckGo',
                      sourceUrl: topic.FirstURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                      title: topic.Text || query,
                    });
                  }
                });
              }
            }

            // Fallback to Yahoo Images (acts as a web search engine similar to DDG) to get more images
            try {
              const yahooUrl = `https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}&vm=p`;
              const yahooRes = await fetchWithProxy(yahooUrl);
              if (yahooRes && yahooRes.ok) {
                const text = await yahooRes.text();
                const regex = /data-obj='(.*?)'/g;
                let match;
                let idx = 0;
                while ((match = regex.exec(text)) !== null && idx < 40) {
                  try {
                    const obj = JSON.parse(match[1].replace(/&quot;/g, '"'));
                    if (obj.imgurl) {
                      results.push({
                        id: `ddg-web-${idx}-${Math.random().toString(36).substring(7)}`,
                        url: obj.imgurl,
                        thumbnail: obj.thumburl || obj.imgurl,
                        source: 'DuckDuckGo / Web',
                        sourceUrl: obj.rurl || yahooUrl,
                        title: obj.tit || `${query} - Web Image ${idx + 1}`
                      });
                      idx++;
                    }
                  } catch(e) {}
                }
              }
            } catch (e) {
              console.warn("DDG/Web fallback failed", e);
            }
            
            if (results.length > 0) {
              addResults(results);
            }
          } catch (e) {
            console.warn("DuckDuckGo search failed", e);
          }
        })()
      );

      // Source: Google Images (Web Scrape)
      searchPromises.push(
        (async () => {
          try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=off`;
            const res = await fetchWithProxy(searchUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (res && res.ok) {
              const text = await res.text();
              const urls = new Set<string>();
              
              // Pattern 1: Google's array format ["url", height, width]
              const regex1 = /\["(https:\/\/[^"]+)",\d+,\d+\]/g;
              let match;
              while ((match = regex1.exec(text)) !== null) {
                urls.add(match[1]);
              }
              
              // Pattern 2: Generic image URLs in quotes
              const regex2 = /"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi;
              while ((match = regex2.exec(text)) !== null) {
                urls.add(match[1]);
              }

              const results: ImageData[] = [];
              let idx = 0;
              
              for (let url of urls) {
                if (idx >= 60) break;
                
                // Clean unicode escapes
                url = url.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\\/g, '\\');
                
                // Filter out Google's own thumbnails, icons, and tracking pixels
                if (url.includes('gstatic.com') || url.includes('google.com') || url.includes('favicon') || url.includes('profile')) continue;
                
                results.push({
                  id: `google-${idx}-${Math.random().toString(36).substring(7)}`,
                  url,
                  thumbnail: url, // Proxy will handle resizing
                  source: 'Google Images',
                  sourceUrl: searchUrl,
                  title: `${query} - Google Image ${idx + 1}`
                });
                idx++;
              }
              
              if (results.length > 0) {
                addResults(results);
              }
            }
          } catch (e) {
            console.warn("Google Images search failed", e);
          }
        })()
      );

      // Source: Bing Dataset (formerly Google/Bing)
      searchPromises.push(
        (async () => {
          try {
            const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&adlt=off`;
            const res = await fetchWithProxy(searchUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (res && res.ok) {
              const text = await res.text();
              const regex = /murl&quot;:&quot;(.*?)&quot;.*?turl&quot;:&quot;(.*?)&quot;/g;
              let match;
              const results: ImageData[] = [];
              let idx = 0;
              while ((match = regex.exec(text)) !== null && idx < 100) {
                const url = match[1].replace(/&amp;/g, '&');
                const thumbnail = match[2].replace(/&amp;/g, '&');
                results.push({
                  id: `bing-${idx}-${Math.random().toString(36).substring(7)}`,
                  url,
                  thumbnail,
                  source: 'Bing Images',
                  sourceUrl: searchUrl,
                  title: `${query} - Bing Image ${idx + 1}`
                });
                idx++;
              }
              addResults(results);
            }
          } catch (e) {
            console.warn("Bing Images failed", e);
          }
        })()
      );

      // Source: Safebooru (Anime / Manga Characters)
      searchPromises.push(
        (async () => {
          try {
            const tags = query.trim().replace(/\s+/g, '_');
            const apiUrl = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(tags)}&json=1&limit=40`;
            const res = await fetchWithProxy(apiUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (res && res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                const results = data.map((item: any) => ({
                  id: `safebooru-${item.id}`,
                  url: `https://safebooru.org/images/${item.directory}/${item.image}`,
                  thumbnail: `https://safebooru.org/thumbnails/${item.directory}/thumbnail_${item.image.replace(/\.[^/.]+$/, "")}.jpg`,
                  source: 'Safebooru',
                  sourceUrl: `https://safebooru.org/index.php?page=post&s=view&id=${item.id}`,
                  title: item.tags || query,
                  width: item.width,
                  height: item.height
                }));
                addResults(results);
              }
            }
          } catch (e) {
            console.warn("Safebooru failed", e);
          }
        })()
      );

      // Source: Flickr (IRL, Photography)
      searchPromises.push(
        (async () => {
          try {
            const tags = query.trim().replace(/\s+/g, ',');
            const apiUrl = `https://api.flickr.com/services/feeds/photos_public.gne?tags=${encodeURIComponent(tags)}&format=json&nojsoncallback=1`;
            const res = await fetchWithProxy(apiUrl);
            setSearchProgress(prev => Math.min(prev + 10, 85));
            if (res && res.ok) {
              const data = await res.json();
              if (data?.items) {
                const results = data.items.map((item: any, idx: number) => ({
                  id: `flickr-${idx}-${Math.random().toString(36).substring(7)}`,
                  url: item.media.m.replace('_m.jpg', '_b.jpg'), // Get larger image
                  thumbnail: item.media.m,
                  source: 'Flickr',
                  sourceUrl: item.link,
                  title: item.title || query
                }));
                addResults(results);
              }
            }
          } catch (e) {
            console.warn("Flickr failed", e);
          }
        })()
      );

      setSearchProgress(50);
      
      // Use a race to not wait forever for slow sources
      const allSettledPromise = Promise.allSettled(searchPromises);
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 12000));
      
      await Promise.race([allSettledPromise, timeoutPromise]);
      
      setSearchProgress(90);

      if (allResults.length === 0) {
        if (!isLoadMore) setError("No results found. Try a different search term.");
        setHasMore(false);
        return;
      }

      // Final Deduplication and Update
      const uniqueImages = allResults;
      
      // Auto-select based on count
      if (!isLoadMore) {
        const initialSelected = new Set(uniqueImages.slice(0, selectedCount).map(img => img.id));
        setSelectedImageIds(initialSelected);
        setSearchCache(prev => ({ ...prev, [cacheKey]: uniqueImages }));
      } else {
        // If loading more, update cache as well
        setSearchCache(prev => ({ ...prev, [cacheKey]: uniqueImages }));
      }

      setPage(currentPage);
      setHasMore(allResults.length > images.length);

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
      handleSearch(undefined, false, keyword);
    }
  }, []);

  const filteredImages = React.useMemo(() => {
    return images.filter(img => {
      if (failedImages.has(img.id)) return false;

      // Quality filter
      if (filterQuality === "High (500px+)") {
        if (img.width && img.height && (img.width < 500 || img.height < 500)) return false;
      } else if (filterQuality === "Ultra (1000px+)") {
        if (img.width && img.height && (img.width < 1000 || img.height < 1000)) return false;
      }

      // Exclude irrelevant patterns/designs but keep cosplay and characters
      const excludedTerms = [
        'pattern', 'texture', 'background', 'logo', 'vector', 'clipart', 
        'gradient', 'solid color', 'blank', 'aesthetic background', 
        'ribbon', 'bows', 'frame', 'border', 'template', 'layout', 'palette',
        'icon', 'button', 'banner', 'ui ', ' ux ', 'mockup', 'wireframe',
        'color palette', 'swatch', 'color scheme', 'wallpaper background',
        'abstract', 'minimalist', 'geometric', 'shape', 'overlay', 'text box'
      ];
      
      // Only apply exclusion if the query itself doesn't contain these words
      const queryLower = keyword.toLowerCase();
      const shouldExclude = !excludedTerms.some(term => queryLower.includes(term));

      if (shouldExclude) {
        const textToSearch = `${img.title} ${img.url} ${img.sourceUrl || ''}`.toLowerCase();
        // Don't exclude if it's from a trusted anime source, as they often have tags like "simple background"
        const trustedSources = ['Safebooru', 'Danbooru', 'Gelbooru', 'Konachan', 'Yande.re', 'Realbooru', 'Rule34', 'Xbooru', 'Pixiv', 'Sankaku'];
        if (!trustedSources.some(src => img.source.includes(src))) {
          if (excludedTerms.some(term => textToSearch.includes(term))) return false;
        }
      }

      if (filterOrientation !== "All") {
        if (!img.width || !img.height) return false;
        const ratio = img.width / img.height;
        if (filterOrientation === "Portrait" && ratio >= 1) return false;
        if (filterOrientation === "Landscape" && ratio <= 1) return false;
        if (filterOrientation === "Square" && (ratio < 0.9 || ratio > 1.1)) return false;
      }
      return true;
    });
  }, [images, failedImages, filterQuality, filterOrientation, keyword]);

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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search tags, characters, or paste URL..."
                className="w-full pl-12 pr-4 py-4 md:pl-16 md:pr-6 md:py-5 bg-transparent outline-none dark:text-white font-medium text-base md:text-lg rounded-full"
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
              <button
                type="submit"
                disabled={isSearching || !inputValue.trim()}
                className="w-full sm:w-auto px-6 py-4 md:px-8 md:py-5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-500/20 whitespace-nowrap text-base"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isSearching ? "Searching" : "Search"}
              </button>
            </div>
          </div>
        </form>
        
        <div className="flex justify-center gap-2 mb-8">
          {/* Search modes removed as per user request */}
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs text-slate-400">
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
                          setInputValue(char);
                          handleSearch(undefined, false, char);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Search Results ({filteredImages.length})
                </h2>
                {isFromCache && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200">
                    Cached
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected</span>
                  <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                    {selectedImageIds.size}
                  </div>
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
                        ZIP
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
                        Individual
                      </>
                    )}
                  </button>
                </div>
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
                    loading={filteredImages.indexOf(img) < 12 ? "eager" : "lazy"}
                    decoding="async"
                    onError={(e) => {
                      // Fallback for broken thumbnails - try our backend proxy
                      const target = e.target as HTMLImageElement;
                      const triedCount = parseInt(target.dataset.triedCount || '0');
                      const lowerUrl = img.url.toLowerCase();
                      const isGif = lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?') || lowerUrl.includes('giphy.com/media/') || lowerUrl.includes('media.tenor.com/');
                      
                      if (triedCount === 0) {
                        target.dataset.triedCount = '1';
                        target.src = isGif 
                          ? `https://wsrv.nl/?url=${encodeURIComponent(img.thumbnail)}&n=-1`
                          : `https://wsrv.nl/?url=${encodeURIComponent(img.thumbnail)}&output=webp&q=70`;
                      } else if (triedCount === 1) {
                        target.dataset.triedCount = '2';
                        target.src = isGif
                          ? `https://images.weserv.nl/?url=${encodeURIComponent(img.thumbnail)}`
                          : `https://images.weserv.nl/?url=${encodeURIComponent(img.thumbnail)}&output=webp&q=70`;
                      } else if (triedCount === 2) {
                        target.dataset.triedCount = '3';
                        target.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(img.thumbnail)}`;
                      } else {
                        // Final fallback: remove the image from the list
                        setFailedImages(prev => new Set(prev).add(img.id));
                      }
                    }}
                  />
                  
                  <div className={`absolute inset-0 bg-indigo-600/10 transition-opacity ${selectedImageIds.has(img.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  
                  {/* Source Tag */}
                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 bg-black/60 text-white text-[8px] font-bold rounded backdrop-blur-md">
                      {img.source}
                    </span>
                    {(img.url.toLowerCase().endsWith('.gif') || img.url.toLowerCase().includes('.gif?') || img.url.toLowerCase().includes('giphy.com/media/') || img.url.toLowerCase().includes('media.tenor.com/')) && (
                      <span className="px-1.5 py-0.5 bg-amber-500/80 text-white text-[8px] font-bold rounded backdrop-blur-md">
                        GIF
                      </span>
                    )}
                    {(img as any).type && (
                      <span className={`px-1.5 py-0.5 text-white text-[8px] font-bold rounded backdrop-blur-md ${
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
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
