import express from "express";
import cors from "cors";
import { Readable } from "stream";

// Image proxy to handle sites with potentially expired/invalid certificates
// Note: Bypassing SSL verification is disabled to ensure applet sharing compatibility.
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.use(cors());
app.use(express.json());

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
      if (response.status === 401) {
        return res.json([]); 
      }
      return res.status(response.status).json({ error: `Failed to fetch: ${response.status}` });
    }
    
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    res.send(text);
  } catch (error: any) {
    console.error("Proxy booru error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy route for generic API requests to bypass CORS
app.post("/api/proxy-request", async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const startTime = performance.now();
    const response = await fetch(url, {
      method: method || "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...headers
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
    const endTime = performance.now();

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Convert headers to a plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
      time: Math.round(endTime - startTime)
    });

  } catch (error: any) {
    console.error("API Proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to send request" });
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

    // 2. Search for images (fetch multiple pages)
    let searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
    let allResults: any[] = [];
    const maxPages = 4; // Fetch up to ~400 images
    
    for (let i = 0; i < maxPages; i++) {
      if (!searchUrl) break;
      
      const searchRes = await fetch(searchUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Referer": "https://duckduckgo.com/"
        }
      });
      
      if (!searchRes.ok) break;
      
      const data = await searchRes.json();
      allResults = allResults.concat(data.results || []);
      
      if (data.next) {
        const nextPath = data.next.startsWith('/') ? data.next : `/${data.next}`;
        searchUrl = `https://duckduckgo.com${nextPath}`;
      } else {
        break;
      }
    }
    
    const blockedDomains = ['pfphub.com', 'pfptown.com'];
    const results = allResults
      .filter((r: any) => !blockedDomains.some(domain => r.image?.includes(domain)))
      .map((r: any) => ({
      id: `ddg-${Math.random().toString(36).substr(2, 9)}`,
      url: r.image,
      thumbnail: r.thumbnail,
      source: "DuckDuckGo",
      sourceUrl: r.url,
      title: r.title,
      width: r.width,
      height: r.height
    }));

    // Remove duplicates based on URL
    const uniqueResults = Array.from(new Map(results.map((item: any) => [item.url, item])).values());

    res.json({ results: uniqueResults });
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

    // Clean URL - handle potential double encoding
    let targetUrl = imageUrl;
    try {
      // If it's already encoded, decode it once to get a clean version, 
      // then we'll let fetch handle the encoding or use a clean URL object
      if (targetUrl.includes('%')) {
        targetUrl = decodeURIComponent(targetUrl);
      }
      targetUrl = new URL(targetUrl).href;
    } catch (e) {
      targetUrl = imageUrl; // Fallback to original if parsing fails
    }

    const fetchWithHeaders = async (url: string, headers: any) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, { 
          headers,
          signal: controller.signal
        });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    let response: Response | null = null;
    let lastError: any = null;

    const tryStrategy = async (url: string, headers: any) => {
      try {
        const res = await fetchWithHeaders(url, headers);
        return res;
      } catch (e) {
        lastError = e;
        return null;
      }
    };

    // Strategy 1: With Referer
    response = await tryStrategy(targetUrl, {
      ...baseHeaders,
      "Referer": new URL(targetUrl).origin
    });

    // Strategy 2: Without Referer
    if (!response || !response.ok) {
      const nextRes = await tryStrategy(targetUrl, baseHeaders);
      if (nextRes) response = nextRes;
    }

    // Strategy 3: Different User-Agent (Mobile)
    if (!response || !response.ok) {
      const nextRes = await tryStrategy(targetUrl, {
        ...baseHeaders,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        "Referer": new URL(targetUrl).origin
      });
      if (nextRes) response = nextRes;
    }

    // Strategy 3.5: Try HTTP instead of HTTPS (fixes some SSL/TLS issues)
    if (!response || !response.ok) {
      if (targetUrl.startsWith('https://')) {
        const httpUrl = targetUrl.replace('https://', 'http://');
        const nextRes = await tryStrategy(httpUrl, baseHeaders);
        if (nextRes) response = nextRes;
      }
    }

    // Strategy 4: Fallback to public proxy (weserv.nl)
    if (!response || !response.ok) {
      try {
        console.log(`Trying weserv.nl fallback for ${targetUrl}`);
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}`;
        const nextRes = await fetch(proxyUrl, {
          headers: { "User-Agent": baseHeaders["User-Agent"] }
        });
        if (nextRes.ok) response = nextRes;
      } catch (e) {
        lastError = e;
      }
    }

    // Strategy 5: Fallback to another public proxy (corsproxy.io)
    if (!response || !response.ok) {
      try {
        console.log(`Trying corsproxy.io fallback for ${targetUrl}`);
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const nextRes = await fetch(proxyUrl);
        if (nextRes.ok) response = nextRes;
      } catch (e) {
        lastError = e;
      }
    }

    // Strategy 6: Fallback to allorigins
    if (!response || !response.ok) {
      try {
        console.log(`Trying allorigins fallback for ${targetUrl}`);
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const nextRes = await fetch(proxyUrl);
        if (nextRes.ok) response = nextRes;
      } catch (e) {
        lastError = e;
      }
    }

    // Strategy 7: Fallback to codetabs
    if (!response || !response.ok) {
      try {
        console.log(`Trying codetabs fallback for ${targetUrl}`);
        const proxyUrl = `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`;
        const nextRes = await fetch(proxyUrl);
        if (nextRes.ok) response = nextRes;
      } catch (e) {
        lastError = e;
      }
    }

    if (!response || !response.ok) {
      const status = response ? response.status : "Unknown";
      const errorMsg = lastError ? lastError.message : "Failed to fetch";
      
      // If it's a known dead site or SSL error, redirect to a placeholder to avoid breaking the UI
      // Only do this if the request accepts images (e.g., from an <img> tag)
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('image/')) {
        console.log(`Image unavailable (${status}), serving placeholder for: ${targetUrl}`);
        const seed = encodeURIComponent(targetUrl.split('/').pop() || 'fallback');
        return res.redirect(302, `https://picsum.photos/seed/${seed}/400/600?blur=2`);
      }

      console.log(`All proxy strategies failed for ${targetUrl}. Status: ${status}, Error: ${errorMsg}`);
      return res.status(response ? response.status : 500).send(`Failed to fetch image: ${status}. ${errorMsg}`);
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
    console.warn(`Image proxy critical error for ${req.query.url}:`, error.message);
    res.status(500).send("Failed to load image");
  }
});

export default app;
