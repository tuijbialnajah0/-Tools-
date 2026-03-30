import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Search, Download, Image as ImageIcon, ChevronRight, Loader2, AlertCircle, ExternalLink, Sparkles } from "lucide-react";
import JSZip from "jszip";

interface ImageData {
  id: string;
  url: string;
  thumbnail: string;
  source: string;
  sourceUrl: string;
  title: string;
}

export function PFPAnima() {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const imagesPerPage = 30;

  const fetchWithProxy = async (url: string, timeoutMs = 15000) => {
    try {
      // Use our server-side proxy which is much more robust than client-side corsproxy.io
      const res = await fetch(`/api/proxy-booru?url=${encodeURIComponent(url)}`);
      return res;
    } catch (e) {
      console.error("Fetch with proxy failed:", e);
      return null;
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    setIsSearching(true);
    setSearchProgress(0);
    setError(null);
    setAllImages([]);
    setCurrentPage(1);
    setStatusMessage("Initializing search...");

    try {
      const results: ImageData[] = [];
      const seenHashes = new Set<string>();
      const seenFilenames = new Set<string>();

      const addResult = (item: ImageData) => {
        let hash = item.url.split('?')[0].toLowerCase();
        const filename = hash.split('/').pop() || '';
        
        const md5Match = item.url.match(/([a-f0-9]{32})/i);
        if (md5Match) {
          hash = md5Match[1].toLowerCase();
        }

        if (!seenHashes.has(hash) && !seenFilenames.has(filename)) {
          seenHashes.add(hash);
          if (filename) seenFilenames.add(filename);
          results.push(item);
        }
      };

      const fetchPromises = [];
      const totalSources = 15;
      let completedSources = 0;

      const updateSearchStatus = (sourceName: string) => {
        completedSources++;
        const progress = Math.round((completedSources / totalSources) * 100);
        setSearchProgress(progress);
        setStatusMessage(`Searching ${sourceName}... (${completedSources}/${totalSources})`);
      };

      const baseQuery = keyword.trim();
      const cleanKeyword = baseQuery.toLowerCase().replace(/\s+/g, '_');

      // 1. Pinterest (via Bing Images)
      fetchPromises.push((async () => {
        try {
          const searchUrl = `https://www.bing.com/images/search?q=pinterest+${encodeURIComponent(baseQuery)}+aesthetic+anime+pfp`;
          const res = await fetchWithProxy(searchUrl);
          if (res && res.ok) {
            const text = await res.text();
            const regex = /murl&quot;:&quot;(.*?)&quot;.*?turl&quot;:&quot;(.*?)&quot;/g;
            let match;
            let idx = 0;
            while ((match = regex.exec(text)) !== null) {
              const url = match[1].replace(/&amp;/g, '&');
              const thumbnail = match[2].replace(/&amp;/g, '&');
              
              if (url.includes('pinimg.com') || idx < 15) {
                addResult({
                  id: `pin-${idx}-${Math.random()}`,
                  url,
                  thumbnail,
                  source: 'Pinterest',
                  sourceUrl: url,
                  title: baseQuery,
                });
                idx++;
              }
            }
          }
        } catch (err) {} finally { updateSearchStatus("Pinterest"); }
      })());

      // 2. Wallhaven
      fetchPromises.push((async () => {
        try {
          const queries = [`${baseQuery} anime`, `${baseQuery} pfp`];
          for (const q of queries) {
            const res = await fetchWithProxy(`https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(q)}&purity=100&sorting=relevance`);
            if (res && res.ok) {
              const data = await res.json();
              data.data?.forEach((item: any) => {
                addResult({
                  id: `wh-${item.id}`,
                  url: item.path,
                  thumbnail: item.thumbs?.large || item.thumbs?.original || item.path,
                  source: 'Wallhaven',
                  sourceUrl: item.url,
                  title: baseQuery,
                });
              });
            }
          }
        } catch (err) {} finally { updateSearchStatus("Wallhaven"); }
      })());

      // 3. Reddit
      fetchPromises.push((async () => {
        try {
          const subreddits = ['AestheticWallpapers', 'PFP', 'AnimeWallpapers', 'Moescape', 'awwnime'];
          const redditPromises = subreddits.map(async (sub) => {
            try {
              const res = await fetchWithProxy(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(baseQuery)}&restrict_sr=on&sort=relevance&t=all&limit=50`);
              if (res && res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                  try {
                    const data = await res.json();
                    const posts = data.data?.children || [];
                    posts.forEach((post: any) => {
                      const d = post.data;
                      if (d.url && (d.url.endsWith('.jpg') || d.url.endsWith('.png') || d.url.endsWith('.jpeg'))) {
                        addResult({
                          id: `reddit-${d.id}`,
                          url: d.url.split('?')[0],
                          thumbnail: d.thumbnail && d.thumbnail.startsWith('http') ? d.thumbnail : d.url.split('?')[0],
                          source: 'Reddit',
                          sourceUrl: `https://reddit.com${d.permalink}`,
                          title: d.title,
                        });
                      }
                    });
                  } catch (jsonErr) {
                    console.warn(`Reddit JSON parse failed for r/${sub}`);
                  }
                } else {
                  console.warn(`Reddit returned non-JSON response for r/${sub}`);
                }
              }
            } catch (e) {}
          });
          await Promise.all(redditPromises);
        } catch (err) {} finally { updateSearchStatus("Reddit"); }
      })());

      // 4. Danbooru
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent('*' + cleanKeyword + '* rating:g')}&limit=100`);
          if (res && res.ok) {
            const data = await res.json();
            data.forEach((item: any) => {
              if (item.file_url) {
                addResult({
                  id: `dan-${item.id}`,
                  url: item.file_url.split('?')[0],
                  thumbnail: item.preview_file_url || item.file_url.split('?')[0],
                  source: 'Danbooru',
                  sourceUrl: `https://danbooru.donmai.us/posts/${item.id}`,
                  title: item.tag_string_character || baseQuery,
                });
              }
            });
          }
        } catch (err) {} finally { updateSearchStatus("Danbooru"); }
      })());

      // 5. Gelbooru
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeURIComponent('*' + cleanKeyword + '* rating:safe')}`);
          if (res && res.ok) {
            const data = await res.json();
            const posts = data.post || [];
            posts.forEach((item: any) => {
              if (item.file_url) {
                addResult({
                  id: `gel-${item.id}`,
                  url: item.file_url.split('?')[0],
                  thumbnail: item.preview_url || item.file_url.split('?')[0],
                  source: 'Gelbooru',
                  sourceUrl: `https://gelbooru.com/index.php?page=post&s=view&id=${item.id}`,
                  title: baseQuery,
                });
              }
            });
          }
        } catch (err) {} finally { updateSearchStatus("Gelbooru"); }
      })());

      // 6. Safebooru
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeURIComponent('*' + cleanKeyword + '*')}`);
          if (res && res.ok) {
            const data = await res.json();
            data.forEach((item: any) => {
              if (item.image) {
                const url = `https://safebooru.org/images/${item.directory}/${item.image}`;
                addResult({
                  id: `safe-${item.id}`,
                  url,
                  thumbnail: `https://safebooru.org/thumbnails/${item.directory}/thumbnail_${item.image}`,
                  source: 'Safebooru',
                  sourceUrl: `https://safebooru.org/index.php?page=post&s=view&id=${item.id}`,
                  title: baseQuery,
                });
              }
            });
          }
        } catch (err) {} finally { updateSearchStatus("Safebooru"); }
      })());

      // 7. Zerochan
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://www.zerochan.net/${encodeURIComponent(baseQuery)}?json`);
          if (res && res.ok) {
            const data = await res.json();
            const items = data.items || [];
            items.forEach((item: any) => {
              addResult({
                id: `zero-${item.id}`,
                url: item.full || item.large || item.thumbnail,
                thumbnail: item.thumbnail || item.large || item.full,
                source: 'Zerochan',
                sourceUrl: `https://www.zerochan.net/${item.id}`,
                title: item.tag || baseQuery,
              });
            });
          }
        } catch (err) {} finally { updateSearchStatus("Zerochan"); }
      })());

      // 8. Konachan
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://konachan.net/post.json?tags=${encodeURIComponent(cleanKeyword)}&limit=100`);
          if (res && res.ok) {
            const data = await res.json();
            data.forEach((item: any) => {
              if (item.file_url) {
                addResult({
                  id: `kona-${item.id}`,
                  url: item.file_url.split('?')[0],
                  thumbnail: item.preview_url || item.file_url.split('?')[0],
                  source: 'Konachan',
                  sourceUrl: `https://konachan.net/post/show/${item.id}`,
                  title: item.tags || baseQuery,
                });
              }
            });
          }
        } catch (err) {} finally { updateSearchStatus("Konachan"); }
      })());

      // 9. Yande.re
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://yande.re/post.json?tags=${encodeURIComponent(cleanKeyword)}&limit=100`);
          if (res && res.ok) {
            const data = await res.json();
            data.forEach((item: any) => {
              if (item.file_url) {
                addResult({
                  id: `yande-${item.id}`,
                  url: item.file_url.split('?')[0],
                  thumbnail: item.preview_url || item.file_url.split('?')[0],
                  source: 'Yande.re',
                  sourceUrl: `https://yande.re/post/show/${item.id}`,
                  title: item.tags || baseQuery,
                });
              }
            });
          }
        } catch (err) {} finally { updateSearchStatus("Yande.re"); }
      })());

      // 10. Waifu.im
      const waifuTags = ['waifu', 'maid', 'marin-kitagawa', 'mori-calliope', 'raiden-shogun', 'oppai', 'selfies', 'uniform'];
      const matchedWaifuTag = waifuTags.find(t => cleanKeyword.includes(t.replace('-', ' ')));
      if (matchedWaifuTag || cleanKeyword === 'anime' || cleanKeyword === 'pfp') {
        fetchPromises.push((async () => {
          try {
            const url = matchedWaifuTag ? `https://api.waifu.im/search?included_tags=${matchedWaifuTag}&many=true` : `https://api.waifu.im/search?many=true`;
            const res = await fetchWithProxy(url);
            if (res && res.ok) {
              const data = await res.json();
              data.images?.forEach((item: any) => {
                if (item.url) {
                  addResult({
                    id: `waifuim-${item.image_id}`,
                    url: item.url,
                    thumbnail: item.url,
                    source: 'Waifu.im',
                    sourceUrl: item.source || item.url,
                    title: matchedWaifuTag || 'Waifu',
                  });
                }
              });
            }
          } catch (err) {} finally { updateSearchStatus("Waifu.im"); }
        })());
      } else {
        updateSearchStatus("Waifu.im");
      }

      // 11. Nekos.best
      const nekoTypes = ['neko', 'kitsune', 'husbando', 'waifu'];
      const matchedNekoType = nekoTypes.find(t => cleanKeyword.includes(t));
      if (matchedNekoType || cleanKeyword === 'anime' || cleanKeyword === 'pfp') {
        fetchPromises.push((async () => {
          try {
            const type = matchedNekoType || 'waifu';
            const res = await fetchWithProxy(`https://nekos.best/api/v2/${type}?amount=20`);
            if (res && res.ok) {
              const data = await res.json();
              data.results?.forEach((item: any, idx: number) => {
                if (item.url) {
                  addResult({
                    id: `nekosbest-${idx}-${Math.random()}`,
                    url: item.url,
                    thumbnail: item.url,
                    source: 'Nekos.best',
                    sourceUrl: item.source_url || item.url,
                    title: item.artist_name || type,
                  });
                }
              });
            }
          } catch (err) {} finally { updateSearchStatus("Nekos.best"); }
        })());
      } else {
        updateSearchStatus("Nekos.best");
      }

      // 12. MyAnimeList (Jikan API)
      fetchPromises.push((async () => {
        try {
          const res = await fetchWithProxy(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(baseQuery)}&limit=1`);
          if (res && res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              const charId = data.data[0].mal_id;
              const charName = data.data[0].name;
              const picsRes = await fetchWithProxy(`https://api.jikan.moe/v4/characters/${charId}/pictures`);
              if (picsRes && picsRes.ok) {
                const picsData = await picsRes.json();
                picsData.data?.forEach((pic: any) => {
                  if (pic.jpg?.image_url) {
                    addResult({
                      id: `mal-${charId}-${Math.random()}`,
                      url: pic.jpg.image_url,
                      thumbnail: pic.jpg.image_url,
                      source: 'MyAnimeList',
                      sourceUrl: data.data[0].url,
                      title: charName,
                    });
                  }
                });
              }
            }
          }
        } catch (err) {} finally { updateSearchStatus("MyAnimeList"); }
      })());

      // 13. Waifu.pics
      const waifuPicsTypes = ['waifu', 'neko', 'shinobu', 'megumin'];
      const matchedWaifuPicsType = waifuPicsTypes.find(t => cleanKeyword.includes(t));
      if (matchedWaifuPicsType || cleanKeyword === 'anime' || cleanKeyword === 'pfp') {
        fetchPromises.push((async () => {
          try {
            const type = matchedWaifuPicsType || 'waifu';
            const res = await fetchWithProxy(`https://api.waifu.pics/sfw/${type}`);
            if (res && res.ok) {
              const data = await res.json();
              if (data.url) {
                addResult({
                  id: `waifupics-${Math.random()}`,
                  url: data.url,
                  thumbnail: data.url,
                  source: 'Waifu.pics',
                  sourceUrl: data.url,
                  title: type,
                });
              }
            }
          } catch (err) {} finally { updateSearchStatus("Waifu.pics"); }
        })());
      } else {
        updateSearchStatus("Waifu.pics");
      }

      // 14. Nekobot.xyz
      const nekobotTypes = ['neko', 'waifu'];
      const matchedNekobotType = nekobotTypes.find(t => cleanKeyword.includes(t));
      if (matchedNekobotType || cleanKeyword === 'anime' || cleanKeyword === 'pfp') {
        fetchPromises.push((async () => {
          try {
            const type = matchedNekobotType || 'waifu';
            const res = await fetchWithProxy(`https://nekobot.xyz/api/image?type=${type}`);
            if (res && res.ok) {
              const data = await res.json();
              if (data.message) {
                addResult({
                  id: `nekobot-${Math.random()}`,
                  url: data.message,
                  thumbnail: data.message,
                  source: 'Nekobot.xyz',
                  sourceUrl: data.message,
                  title: type,
                });
              }
            }
          } catch (err) {} finally { updateSearchStatus("Nekobot.xyz"); }
        })());
      } else {
        updateSearchStatus("Nekobot.xyz");
      }

      // 15. Nekos.life
      const nekosLifeTypes = ['neko', 'waifu'];
      const matchedNekosLifeType = nekosLifeTypes.find(t => cleanKeyword.includes(t));
      if (matchedNekosLifeType || cleanKeyword === 'anime' || cleanKeyword === 'pfp') {
        fetchPromises.push((async () => {
          try {
            const type = matchedNekosLifeType || 'waifu';
            const res = await fetchWithProxy(`https://nekos.life/api/v2/img/${type}`);
            if (res && res.ok) {
              const data = await res.json();
              if (data.url) {
                addResult({
                  id: `nekoslife-${Math.random()}`,
                  url: data.url,
                  thumbnail: data.url,
                  source: 'Nekos.life',
                  sourceUrl: data.url,
                  title: type,
                });
              }
            }
          } catch (err) {} finally { updateSearchStatus("Nekos.life"); }
        })());
      } else {
        updateSearchStatus("Nekos.life");
      }

      await Promise.allSettled(fetchPromises);

      if (results.length === 0) {
        setError("No images found. Try a different character or keyword.");
      } else {
        // Shuffle results to mix sources
        for (let i = results.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [results[i], results[j]] = [results[j], results[i]];
        }
        setAllImages(results);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during search.");
    } finally {
      setIsSearching(false);
      setStatusMessage("");
    }
  };

  const downloadSingleImage = async (img: ImageData) => {
    try {
      // Always use our robust image proxy for downloads to bypass CORS and hotlinking protections
      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(img.url)}`);
      if (!response.ok) throw new Error("Proxy failed");
      
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
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download image. The source might be protected.");
    }
  };

  const downloadCurrentPage = async () => {
    const currentImages = allImages.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);
    if (currentImages.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      let successCount = 0;
      
      const concurrency = 5;
      for (let i = 0; i < currentImages.length; i += concurrency) {
        const chunk = currentImages.slice(i, i + concurrency);
        
        await Promise.all(chunk.map(async (img) => {
          try {
            // Use our robust server-side proxy
            const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(img.url)}`);
            
            if (response && response.ok) {
              const blob = await response.blob();
              const ext = img.url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
              const filename = `${keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${String(successCount + 1).padStart(3, '0')}.${ext}`;
              zip.file(filename, blob);
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to download ${img.url}`, err);
          }
        }));
        
        setDownloadProgress(Math.round(((i + chunk.length) / currentImages.length) * 100));
      }

      if (successCount === 0) {
        throw new Error("Failed to download any images.");
      }

      setStatusMessage("Zipping files...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const customBlob = new Blob([zipBlob], { type: "application/octet-stream" });
      
      const url = URL.createObjectURL(customBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `anima_${safeKeyword}_page_${currentPage}_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatusMessage(`Successfully downloaded ${successCount} images!`);
      setTimeout(() => setStatusMessage(""), 3000);

    } catch (err: any) {
      setError(err.message || "Failed to download page.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const totalPages = Math.ceil(allImages.length / imagesPerPage);
  const currentImages = allImages.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);

  const getOptimizedThumbnail = (url: string) => {
    if (!url) return '';
    // Use weserv.nl for fast, resized, webp previews (low quality for speed)
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=300&h=300&fit=cover&output=webp&q=50`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-indigo-600" />
            PFP Anima
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse and download high-quality anime profile pictures and wallpapers.
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
              placeholder="Search for characters, anime, waifus..."
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

      {allImages.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Found {allImages.length} images
              </span>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={downloadCurrentPage}
                disabled={isDownloading}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center disabled:opacity-50"
              >
                {isDownloading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {downloadProgress}%</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Download Page</>
                )}
              </button>
              
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isDownloading}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold px-2 dark:text-white">{currentPage}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isDownloading}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentImages.map((img) => (
              <div key={img.id} className="group relative aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
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
                      target.src = img.thumbnail; // Fallback to original thumbnail
                    } else if (!target.dataset.triedProxy) {
                      target.dataset.triedProxy = 'true';
                      // Use our robust server-side proxy as the ultimate fallback
                      target.src = `/api/image-proxy?url=${encodeURIComponent(img.url)}`;
                    } else if (!target.dataset.triedPlaceholder) {
                      target.dataset.triedPlaceholder = 'true';
                      target.src = `https://picsum.photos/seed/${img.id}/400/600?blur=2`;
                    }
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-1 bg-indigo-600 text-white rounded-md uppercase tracking-wider">
                      {img.source}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium line-clamp-2 mb-3" title={img.title}>
                    {img.title || "Untitled"}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadSingleImage(img)}
                      className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Download className="w-3 h-3 mr-1" /> Save
                    </button>
                    <a 
                      href={img.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg transition-colors flex items-center justify-center"
                      title="Open Source"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isDownloading}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 transition-colors flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </button>
                <div className="px-4 py-2 text-sm font-bold text-slate-900 dark:text-white">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isDownloading}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 transition-colors flex items-center"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
