import express from "express";
import serverless from "serverless-http";

const app = express();

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/search-images", async (req, res) => {
  const keyword = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  
  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required" });
  }

  try {
    // Primary: Qwant API (Very Fast)
    const offset = (page - 1) * 50;
    const qwantUrl = `https://api.qwant.com/v3/search/images?count=50&q=${encodeURIComponent(keyword)}&t=images&safesearch=1&locale=en_US&offset=${offset}&device=desktop`;
    
    const qwantRes = await fetch(qwantUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!qwantRes.ok) {
      throw new Error("Qwant primary search failed.");
    }

    const qwantData = await qwantRes.json();

    if (!qwantData || !qwantData.data || !qwantData.data.result || !qwantData.data.result.items) {
      return res.json({ results: [] });
    }

    const results = qwantData.data.result.items.map((r: any, idx: number) => ({
      id: `qwant-${page}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      url: r.media,
      thumbnail: r.thumbnail,
      source: new URL(r.url || r.media).hostname.replace('www.', '') || "Web",
      sourceUrl: r.url,
      title: r.title || keyword,
      width: r.width,
      height: r.height
    }));

    return res.json({ results });

  } catch (error: any) {
    console.error("Qwant search failed, falling back to Wikimedia:", error);
    
    try {
      const offset = (page - 1) * 50;
      const simpleKeyword = keyword.split(' -')[0].trim();
      const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(simpleKeyword)}&gsrnamespace=6&gsrlimit=50&gsroffset=${offset}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;
      
      const wikiRes = await fetch(wikiUrl, {
        headers: {
          "User-Agent": "ImageDatasetCollector/1.0 (https://example.com/)"
        }
      });

      if (!wikiRes.ok) {
        throw new Error("Wikimedia fallback failed.");
      }

      const wikiData = await wikiRes.json();

      if (!wikiData || !wikiData.query || !wikiData.query.pages) {
        return res.json({ results: [] });
      }

      const pages = Object.values(wikiData.query.pages) as any[];
      const results = pages
        .filter(p => p.imageinfo && p.imageinfo[0])
        .map((p: any, idx: number) => {
          const info = p.imageinfo[0];
          return {
            id: `wiki-${page}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            url: info.url,
            thumbnail: info.thumburl || info.url,
            source: "Wikimedia Commons",
            sourceUrl: info.descriptionurl,
            title: p.title.replace('File:', '').replace(/\.[^/.]+$/, "") || keyword,
            width: info.width,
            height: info.height
          };
        });

      return res.json({ results });

    } catch (fallbackError: any) {
      console.error("Wikimedia fallback also failed:", fallbackError);
      return res.status(500).json({ error: "Both primary and fallback search engines failed to respond." });
    }
  }
});

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

export const handler = serverless(app);
