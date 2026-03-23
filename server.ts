import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Enable SharedArrayBuffer for AI models
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // Proxy route for downloading videos
  app.get("/api/download", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      const title = req.query.title as string || "video";

      if (!videoUrl) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Fetch the video from the source
      const response = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "*/*"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "video/mp4";
      const contentLength = response.headers.get("content-length");

      // Set headers to force download
      res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4"`);
      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      // Stream the response body to the client
      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.status(500).json({ error: "Response body is empty" });
      }

    } catch (error: any) {
      console.error("Download proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to download video" });
    }
  });

  // Proxy route for image search and fetching
  app.get("/api/proxy-booru", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).json({ error: "URL is required" });

      const urlObj = new URL(targetUrl);
      
      const fetchWithHeaders = async (url: string, headers: Record<string, string>) => {
        const urlObj = new URL(url);
        return await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": `${urlObj.protocol}//${urlObj.hostname}/`,
            ...headers
          }
        });
      };

      let response = await fetchWithHeaders(targetUrl, {});

      // If 401 (Unauthorized) or 403 (Forbidden), try fallbacks
      if (!response.ok && (response.status === 401 || response.status === 403)) {
        console.warn(`Booru primary fetch failed with ${response.status} for ${targetUrl}, trying fallback strategies...`);
        
        // Strategy 1: Try with a different User-Agent (Mobile)
        const mobileRes = await fetchWithHeaders(targetUrl, {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        });
        
        if (mobileRes.ok) {
          response = mobileRes;
        } else {
          // Strategy 2: Try a public CORS proxy
          const fallbackProxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`
          ];

          for (const proxyUrl of fallbackProxies) {
            try {
              console.log(`Trying proxy: ${proxyUrl}`);
              const proxyRes = await fetch(proxyUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                }
              });
              if (proxyRes.ok) {
                response = proxyRes;
                console.log("Proxy fallback succeeded!");
                break;
              }
            } catch (e) {
              console.warn(`Fallback proxy ${proxyUrl} failed`);
            }
          }
        }
      }

      if (!response.ok) {
        console.error(`Booru fetch failed: ${response.status} for ${targetUrl}`);
        // If it's still 401, maybe try to just return an empty array to avoid crashing the frontend
        if (response.status === 401) {
          return res.json([]); 
        }
        return res.status(response.status).json({ error: `Failed to fetch: ${response.status}` });
      }
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (e) {
        // If it's not JSON, it might be XML or an error page
        console.error("Failed to parse booru response as JSON:", text.substring(0, 100));
        res.status(500).json({ error: "Invalid response format from Booru" });
      }
    } catch (error: any) {
      console.error("Proxy booru error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search-duckduckgo", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Query is required" });

    try {
      // 1. Get the vqd token - try multiple times or different patterns
      const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_`, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      const text = await tokenRes.text();
      
      // Try multiple regex patterns for vqd
      const vqdMatch = text.match(/vqd=['"]([^'"]+)['"]/) || 
                       text.match(/vqd=([^&"']+)/) ||
                       text.match(/\.vqd\s*=\s*['"]([^'"]+)['"]/) ||
                       text.match(/vqd:['"]([^'"]+)['"]/);
                       
      if (!vqdMatch) {
        // Fallback: try a different search URL if the first one failed to give a token
        const fallbackRes = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
        const fallbackText = await fallbackRes.text();
        const fallbackVqd = fallbackText.match(/vqd=['"]([^'"]+)['"]/);
        if (!fallbackVqd) {
          console.error("DDG HTML sample (first 1000 chars):", text.substring(0, 1000));
          throw new Error("Could not find vqd token");
        }
        var vqd = fallbackVqd[1];
      } else {
        var vqd = vqdMatch[1];
      }

      // 2. Search for images
      const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
      const searchRes = await fetch(searchUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Referer": "https://duckduckgo.com/"
        }
      });
      const data = await searchRes.json();
      
      const results = (data.results || []).map((r: any) => ({
        id: `ddg-${Math.random().toString(36).substr(2, 9)}`,
        url: r.image,
        thumbnail: r.thumbnail,
        source: "DuckDuckGo",
        sourceUrl: r.url,
        title: r.title,
        width: r.width,
        height: r.height
      }));

      res.json({ results });
    } catch (error: any) {
      console.error("DDG search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/search-reddit", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Query is required" });

    try {
      const ddgQuery = `${query} site:reddit.com`;
      
      // 1. Get the vqd token
      const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(ddgQuery)}&t=h_`, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      const text = await tokenRes.text();
      
      const vqdMatch = text.match(/vqd=['"]([^'"]+)['"]/) || 
                       text.match(/vqd=([^&"']+)/) ||
                       text.match(/\.vqd\s*=\s*['"]([^'"]+)['"]/) ||
                       text.match(/vqd:['"]([^'"]+)['"]/);
                       
      if (!vqdMatch) {
        const fallbackRes = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`);
        const fallbackText = await fallbackRes.text();
        const fallbackVqd = fallbackText.match(/vqd=['"]([^'"]+)['"]/);
        if (!fallbackVqd) {
          throw new Error("Could not find vqd token for Reddit search");
        }
        var vqd = fallbackVqd[1];
      } else {
        var vqd = vqdMatch[1];
      }

      // 2. Search for images
      const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(ddgQuery)}&vqd=${vqd}&f=,,,`;
      const searchRes = await fetch(searchUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Referer": "https://duckduckgo.com/"
        }
      });
      
      if (!searchRes.ok) {
        throw new Error(`DDG API failed: ${searchRes.status}`);
      }
      
      const data = await searchRes.json();
      
      const results = (data.results || []).map((r: any) => ({
        id: `reddit-${Math.random().toString(36).substr(2, 9)}`,
        url: r.image,
        thumbnail: r.thumbnail,
        source: "Reddit",
        sourceUrl: r.url,
        title: r.title,
        width: r.width,
        height: r.height,
        type: 'General'
      }));
        
      res.json({ results });
    } catch (error: any) {
      console.error("Reddit search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).send("URL is required");

      const fetchWithHeaders = async (headers: any) => {
        return await fetch(imageUrl, { headers });
      };

      const baseHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      };

      // Strategy 1: With Referer
      let response = await fetchWithHeaders({
        ...baseHeaders,
        "Referer": new URL(imageUrl).origin
      });

      // Strategy 2: Without Referer
      if (!response.ok && response.status === 403) {
        response = await fetchWithHeaders(baseHeaders);
      }

      // Strategy 3: Empty Referer
      if (!response.ok && response.status === 403) {
        response = await fetchWithHeaders({
          ...baseHeaders,
          "Referer": ""
        });
      }

      // Strategy 4: Different User-Agent
      if (!response.ok && response.status === 403) {
        response = await fetchWithHeaders({
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
          "Accept": "image/*,*/*;q=0.8",
          "Referer": new URL(imageUrl).origin
        });
      }

      // Strategy 5: Google Bot User-Agent
      if (!response.ok && response.status === 403) {
        response = await fetchWithHeaders({
          "User-Agent": "Googlebot-Image/1.0",
          "Accept": "image/*,*/*;q=0.8"
        });
      }

      if (!response.ok) {
        // Don't throw an error for standard HTTP failures (like 404, 403, 429), 
        // just pass the status code back to the client so it can try its next fallback proxy.
        return res.status(response.status).send(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      
      // Cache control
      res.setHeader("Cache-Control", "public, max-age=86400");

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.status(500).send("Empty response body");
      }
    } catch (error: any) {
      // Only log actual network/code errors, not HTTP status errors
      console.warn(`Image proxy network error for ${req.query.url}:`, error.message);
      res.status(500).send("Failed to load image");
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
