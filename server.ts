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
