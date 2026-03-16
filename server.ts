import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
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
        'Referer': 'https://duckduckgo.com/',
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

      // Use DuckDuckGo's internal API for faster results
      // First, get the VQD token
      let vqdText = "";
      try {
        const vqdResponse = await fetchWithTimeout(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, { headers });
        if (vqdResponse.ok) {
          vqdText = await vqdResponse.text();
        } else {
          console.warn(`Failed to initialize search (Status: ${vqdResponse.status}), trying proxy...`);
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}`;
          const proxyRes = await fetchWithTimeout(proxyUrl, { headers });
          if (proxyRes.ok) {
            vqdText = await proxyRes.text();
          } else {
            console.warn(`Proxy also failed (Status: ${proxyRes.status})`);
          }
        }
      } catch (e) {
        console.warn("Error fetching VQD:", e);
      }
      
      // Try multiple regex patterns for VQD
      let vqdMatch = null;
      if (vqdText) {
        vqdMatch = vqdText.match(/vqd=([^&'"]+)/);
        if (!vqdMatch) {
          vqdMatch = vqdText.match(/vqd\s*[:=]\s*['"]([^'"]+)['"]/);
        }
      }
      
      if (!vqdMatch) {
        console.warn("VQD not found, falling back to HTML search");
        let htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${start}&kp=${safeSearch}`;
        let htmlRes;
        try {
          htmlRes = await fetchWithTimeout(htmlUrl, { headers });
        } catch (e) {
          htmlRes = { ok: false, status: 'timeout' };
        }
        
        if (!htmlRes.ok) {
          console.warn(`HTML search failed (Status: ${htmlRes.status}), trying proxy...`);
          htmlUrl = `https://corsproxy.io/?${encodeURIComponent(htmlUrl)}`;
          htmlRes = await fetchWithTimeout(htmlUrl, { headers }, 6000);
        }
        
        if (!htmlRes.ok) throw new Error(`HTML search failed (Status: ${htmlRes.status})`);
        const html = await htmlRes.text();
        return res.json({ html, source: 'ddg-html' });
      }

      const vqd = vqdMatch[1];
      let apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&s=${start}`;
      
      let apiRes;
      try {
        apiRes = await fetchWithTimeout(apiUrl, { headers });
      } catch (e) {
        apiRes = { ok: false, status: 'timeout' };
      }
      
      if (!apiRes.ok) {
        console.warn(`API search failed (Status: ${apiRes.status}), trying proxy...`);
        apiUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
        apiRes = await fetchWithTimeout(apiUrl, { headers }, 6000);
      }
      
      if (!apiRes.ok) {
        console.warn(`API proxy failed (Status: ${apiRes.status}), falling back to HTML`);
        let htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${start}&kp=${safeSearch}`;
        let htmlRes;
        try {
          htmlRes = await fetchWithTimeout(htmlUrl, { headers });
        } catch (e) {
          htmlRes = { ok: false, status: 'timeout' };
        }
        
        if (!htmlRes.ok) {
          htmlUrl = `https://corsproxy.io/?${encodeURIComponent(htmlUrl)}`;
          htmlRes = await fetchWithTimeout(htmlUrl, { headers }, 6000);
        }
        
        if (!htmlRes.ok) throw new Error(`Fallback HTML search failed (Status: ${htmlRes.status})`);
        const html = await htmlRes.text();
        return res.json({ html, source: 'ddg-html' });
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback for SPA routing in development (if vite middleware doesn't catch it)
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
  } else {
    app.use(express.static("dist"));
    
    // Fallback for SPA routing in production
    app.get("*", async (req, res) => {
      const path = await import("path");
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
