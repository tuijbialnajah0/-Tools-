import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));

app.post("/api/remove-bg", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const base64Data = image.split(',')[1];
    const mimeType = image.split(',')[0].split(':')[1].split(';')[0];
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    // 1. Try RemoveBG
    if (process.env.REMOVE_BG_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('image_file', blob, 'image.png');
        formData.append('size', 'auto');
        formData.append('format', 'png');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': process.env.REMOVE_BG_API_KEY,
          },
          body: formData,
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
          return res.json({ result: `data:image/png;base64,${resultBase64}`, source: 'RemoveBG' });
        } else {
          console.error('RemoveBG failed:', await response.text());
        }
      } catch (e) {
        console.error('RemoveBG error:', e);
      }
    }

    // 2. Try PhotoRoom
    if (process.env.PHOTOROOM_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('image_file', blob, 'image.png');

        const response = await fetch('https://sdk.photoroom.com/v1/segment', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.PHOTOROOM_API_KEY,
          },
          body: formData,
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
          return res.json({ result: `data:image/png;base64,${resultBase64}`, source: 'PhotoRoom' });
        } else {
          console.error('PhotoRoom failed:', await response.text());
        }
      } catch (e) {
        console.error('PhotoRoom error:', e);
      }
    }

    // 3. Try BriaAI
    if (process.env.BRIA_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('image', blob, 'image.png');

        const response = await fetch('https://engine.bria.ai/v1/background/remove', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.BRIA_API_KEY}`,
          },
          body: formData,
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
          return res.json({ result: `data:image/png;base64,${resultBase64}`, source: 'BriaAI' });
        } else {
          console.error('BriaAI failed:', await response.text());
        }
      } catch (e) {
        console.error('BriaAI error:', e);
      }
    }

    // If all fail or no keys configured
    return res.status(500).json({ error: "All premium APIs failed or no keys configured" });

  } catch (err: any) {
    console.error("API error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/search-images", async (req, res) => {
  try {
    const { q, page = "1", nsfw = "1" } = req.query;
    if (!q) return res.status(400).json({ error: "Query required" });

    const query = q as string;
    const safeSearch = nsfw === "1" ? "1" : "-1";
    const start = (parseInt(page as string) - 1) * 100;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // Add a small random delay to avoid rapid-fire detection
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    const fetchWithTimeout = async (url: string, options: any, timeoutMs = 4000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    const fetchWithProxy = async (url: string, options: any, validate?: (text: string) => boolean) => {
      const proxies = [
        '', // Direct
        'https://api.allorigins.win/raw?url='
      ];

      let lastResponse: any = null;
      for (const proxy of proxies) {
        try {
          const targetUrl = proxy ? `${proxy}${encodeURIComponent(url)}` : url;
          const response = await fetchWithTimeout(targetUrl, options, 5000);
          
          if (response.ok) {
            const text = await response.text();
            if (!validate || validate(text)) {
              console.log(`Proxy ${proxy || 'Direct'} succeeded`);
              // Return a mock response object with the text already read
              return {
                ok: true,
                status: response.status,
                text: async () => text,
                json: async () => JSON.parse(text)
              };
            } else {
              console.warn(`Proxy ${proxy || 'Direct'} failed validation`);
              lastResponse = { ok: false, status: response.status, text: async () => text, json: async () => JSON.parse(text) };
            }
          } else {
            console.warn(`Proxy ${proxy || 'Direct'} failed with status: ${response.status}`);
            lastResponse = response;
          }
        } catch (e) {
          console.warn(`Proxy ${proxy || 'Direct'} failed with error:`, e);
        }
      }
      return lastResponse || { ok: false, status: 500, text: async () => "", json: async () => ({}) };
    };

    // Helper to fetch from Bing
    const fetchFromBing = async () => {
      const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${start}`;
      const bingRes = await fetchWithProxy(bingUrl, { headers }, (text) => {
        return [...text.matchAll(/class="iusc"/gi)].length > 0;
      });
      
      if (!bingRes.ok) throw new Error(`Bing search failed (Status: ${bingRes.status})`);
      
      const html = await bingRes.text();
      const snippets = [...html.matchAll(/class="iusc"[^>]+m="([^"]+)"/gi)];
      
      const images = snippets.map(m => {
        try {
          const jsonStr = m[1].replace(/&quot;/g, '"');
          const obj = JSON.parse(jsonStr);
          return {
            image: obj.murl,
            title: obj.t || query,
            source: 'Bing',
            thumbnail: obj.turl
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      if (images.length === 0) {
        throw new Error(`No images found on Bing. HTML length: ${html.length}. Snippet: ` + html.substring(0, 200));
      }
      
      return images;
    };

    // Use DuckDuckGo's internal API for faster results
    // First, get the VQD token
    let vqdText = "";
    const ddgHeaders = { ...headers, 'Referer': 'https://duckduckgo.com/' };
    const vqdResponse = await fetchWithProxy(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, { headers: ddgHeaders });
    if (vqdResponse.ok) {
      vqdText = await vqdResponse.text();
    }
    
    // Try multiple regex patterns for VQD
    let vqdMatch = null;
    if (vqdText) {
      vqdMatch = vqdText.match(/vqd=([^&'"]+)/);
      if (!vqdMatch) {
        vqdMatch = vqdText.match(/vqd\s*[:=]\s*['"]([^'"]+)['"]/);
      }
    }
    
    if (true) {
      console.warn("VQD not found, falling back to Bing");
      try {
        const results = await fetchFromBing();
        return res.json({ data: { results }, source: 'bing' });
      } catch (e: any) {
        throw new Error(`All search methods failed. Last error: ${e.message}`);
      }
    }

    const vqd = vqdMatch[1];
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&s=${start}`;
    
    const apiRes = await fetchWithProxy(apiUrl, { headers: ddgHeaders });
    
    if (!apiRes.ok) {
      console.warn(`API search failed (Status: ${apiRes.status}), falling back to Bing`);
      try {
        const results = await fetchFromBing();
        return res.json({ data: { results }, source: 'bing' });
      } catch (e: any) {
        throw new Error(`All search methods failed. Last error: ${e.message}`);
      }
    }

    const data = await apiRes.json();
    res.json({ data, source: 'ddg-api' });
  } catch (err: any) {
    console.error("Search error:", err);
    res.status(500).json({ 
      error: err.message || "An unexpected error occurred during search",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.get("/api/proxy-image", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    const response = await fetch(url as string);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (contentType) res.setHeader("Content-Type", contentType);
    res.send(buffer);
  } catch (err: any) {
    console.error("Proxy error:", err);
    res.status(500).send(err.message);
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = await import("fs").then(fs => fs.promises.readFile("index.html", "utf-8"));
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else if (!process.env.VERCEL) {
    app.use(express.static("dist"));
    
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
