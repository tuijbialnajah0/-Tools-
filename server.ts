import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Simple in-memory cache for search results
  const searchCache = new Map<string, { results: any[], timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

  app.get("/api/search-images", async (req, res) => {
    const keyword = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    
    if (!keyword) {
      return res.status(400).json({ error: "Keyword is required" });
    }

    // Check cache
    const cacheKey = `${keyword}-${page}`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json({ results: cached.results, cached: true });
    }

    const allResults: any[] = [];

    // Clean keyword for specific sources (Safebooru/Wikimedia)
    const cleanKeyword = keyword
      .replace(/aesthetic/gi, '')
      .replace(/pinterest/gi, '')
      .replace(/anime/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const searchSources = async () => {
      // Create multiple search variations to ensure variety (Anime, Cosplay, Fanart)
      const variations = [
        keyword, // Original
        `${keyword} anime art`,
        `${keyword} cosplay`,
        `${keyword} fanart high quality`
      ];

      const tasks = [
        // 1. DuckDuckGo (Primary - with variations for variety)
        ...variations.map((query, vIdx) => (async () => {
          try {
            const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            const proxies = [
              `https://api.allorigins.win/get?url=${encodeURIComponent(ddgUrl)}`,
              `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(ddgUrl)}`,
              `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(ddgUrl)}`
            ];
            
            const vqd = await Promise.any(proxies.map(async (proxy) => {
              try {
                const vqdRes = await fetch(proxy, { signal: AbortSignal.timeout(4000) });
                if (vqdRes.ok) {
                  const vqdData = await vqdRes.json();
                  const contents = vqdData.contents || vqdData; 
                  const html = typeof contents === 'string' ? contents : JSON.stringify(contents);
                  const match = html.match(/vqd="([^"]+)"/) || html.match(/vqd=([a-zA-Z0-9-]+)/);
                  if (match) return match[1];
                }
              } catch (e) { /* ignore */ }
              throw new Error("VQD not found");
            })).catch(() => null);

            if (vqd) {
              const offset = (page - 1) * 30; // Smaller offset per variation
              const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1&s=${offset}`;
              const searchProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
              
              const searchRes = await fetch(searchProxyUrl, { signal: AbortSignal.timeout(6000) });
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const parsedData = JSON.parse(searchData.contents);
                if (parsedData && parsedData.results) {
                  return parsedData.results.map((r: any, idx: number) => ({
                    id: `ddg-${page}-${vIdx}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                    url: r.image,
                    thumbnail: r.thumbnail,
                    source: "DuckDuckGo",
                    sourceUrl: r.url,
                    title: r.title || query,
                    width: r.width,
                    height: r.height,
                    type: query.includes('cosplay') ? 'Cosplay' : (query.includes('anime') || query.includes('fanart') ? 'Anime/Art' : 'General')
                  }));
                }
              }
            }
          } catch (e) {
            console.error(`DDG search failed for "${query}":`, e);
          }
          return [];
        })()),

        // 2. Safebooru (Strictly Anime/Manga)
        (async () => {
          try {
            const safeTags = cleanKeyword.replace(/\s+/g, '_').toLowerCase();
            const safeUrl = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(safeTags)}&json=1&limit=50&pid=${page - 1}`;
            const safeRes = await fetch(safeUrl, { signal: AbortSignal.timeout(6000) });
            if (safeRes.ok) {
              const safeData = await safeRes.json();
              if (Array.isArray(safeData)) {
                return safeData.map((p: any, idx: number) => ({
                  id: `safe-${page}-${idx}-${p.id}`,
                  url: `https://safebooru.org/images/${p.directory}/${p.image}`,
                  thumbnail: `https://safebooru.org/thumbnails/${p.directory}/thumbnail_${p.image}`,
                  source: "Safebooru",
                  sourceUrl: `https://safebooru.org/index.php?page=post&s=view&id=${p.id}`,
                  title: p.tags || keyword,
                  width: p.width,
                  height: p.height
                }));
              }
            }
          } catch (e) {
            console.error("Safebooru search failed:", e);
          }
          return [];
        })(),

        // 3. Wikimedia (Fallback/Reliable)
        (async () => {
          try {
            const offset = (page - 1) * 50;
            const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanKeyword)}&gsrnamespace=6&gsrlimit=50&gsroffset=${offset}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;
            
            const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(6000) });
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              if (wikiData && wikiData.query && wikiData.query.pages) {
                const pages = Object.values(wikiData.query.pages) as any[];
                return pages
                  .filter(p => p.imageinfo && p.imageinfo[0])
                  .map((p: any, idx: number) => {
                    const info = p.imageinfo[0];
                    return {
                      id: `wiki-${page}-${idx}-${p.pageid}`,
                      url: info.url,
                      thumbnail: info.thumburl || info.url,
                      source: "Wikimedia",
                      sourceUrl: info.descriptionurl,
                      title: p.title.replace('File:', '').replace(/\.[^/.]+$/, "") || keyword,
                      width: info.width,
                      height: info.height
                    };
                  });
              }
            }
          } catch (e) {
            console.error("Wikimedia search failed:", e);
          }
          return [];
        })()
      ];

      const results = await Promise.allSettled(tasks);
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          allResults.push(...res.value);
        }
      });
    };

    await searchSources();

    // Deduplicate by URL
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.url, item])).values()
    );

    // Save to cache
    searchCache.set(cacheKey, { results: uniqueResults, timestamp: Date.now() });

    return res.json({ results: uniqueResults });
  });

  // Proxy image to bypass CORS when downloading
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const imageRes = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": new URL(imageUrl).origin
        }
      });

      if (!imageRes.ok) {
        throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
      }

      const contentType = imageRes.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error) {
      console.error("Image proxy failed:", error);
      res.status(500).send("Failed to proxy image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
