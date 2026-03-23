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

app.get("/api/search-duckduckgo", async (req, res) => {
  const keyword = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  
  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required" });
  }

  try {
    // 1. Get VQD token
    const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(keyword)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const vqdText = await vqdRes.text();
    
    // More robust VQD extraction
    const vqdMatch = vqdText.match(/vqd[=:]\s*['"]?([^&'"]+)['"]?/) || vqdText.match(/vqd=['"]([^'"]+)['"]/);
    const vqd = vqdMatch ? vqdMatch[1] : null;

    if (!vqd) {
      console.error("Could not obtain VQD token from DuckDuckGo HTML");
      throw new Error("Could not obtain VQD token");
    }

    // 2. Fetch images using VQD
    const offset = (page - 1) * 50;
    const ddgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(keyword)}&o=json&p=1&s=${offset}&u=1&f=,,,&vqd=${vqd}`;
    
    const ddgRes = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://duckduckgo.com/"
      }
    });

    if (!ddgRes.ok) {
      throw new Error(`DuckDuckGo i.js failed: ${ddgRes.status}`);
    }

    const ddgData = await ddgRes.json();

    if (!ddgData || !ddgData.results || ddgData.results.length === 0) {
      // Fallback to Qwant if DDG returns no results
      console.log("DDG returned no results, falling back to Qwant...");
      return res.redirect(`/api/search-images?q=${encodeURIComponent(keyword)}&page=${page}`);
    }

    const results = ddgData.results.map((r: any, idx: number) => ({
      id: `ddg-${page}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      url: r.image,
      thumbnail: r.thumbnail,
      source: r.source || "DuckDuckGo",
      sourceUrl: r.url,
      title: r.title || keyword,
      width: r.width,
      height: r.height
    }));

    return res.json({ results });

  } catch (error: any) {
    console.error("DuckDuckGo search failed, falling back to Qwant:", error);
    // Fallback to Qwant on any error
    try {
      const offset = (page - 1) * 50;
      const qwantUrl = `https://api.qwant.com/v3/search/images?count=50&q=${encodeURIComponent(keyword)}&t=images&safesearch=1&locale=en_US&offset=${offset}&device=desktop`;
      
      const qwantRes = await fetch(qwantUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (qwantRes.ok) {
        const qwantData = await qwantRes.json();
        if (qwantData?.data?.result?.items) {
          const results = qwantData.data.result.items.map((r: any, idx: number) => ({
            id: `qwant-fallback-${page}-${idx}`,
            url: r.media,
            thumbnail: r.thumbnail,
            source: "Qwant (Fallback)",
            sourceUrl: r.url,
            title: r.title || keyword,
            width: r.width,
            height: r.height
          }));
          return res.json({ results });
        }
      }
    } catch (fallbackError) {
      console.error("Qwant fallback also failed:", fallbackError);
    }
    
    return res.status(500).json({ error: "Search failed." });
  }
});

app.get("/api/proxy-booru", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("URL is required");

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, application/xml, text/xml"
      }
    });

    if (!response.ok) throw new Error(`Booru proxy failed: ${response.status}`);

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error("Booru proxy failed:", error);
    res.status(500).send("Failed to proxy booru request");
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

    if (response.body) {
      // @ts-ignore
      if (typeof response.body.pipe === 'function') {
        // node-fetch
        // @ts-ignore
        response.body.pipe(res);
      // @ts-ignore
      } else if (typeof response.body.getReader === 'function') {
        // native fetch (Web Streams API)
        // @ts-ignore
        const reader = response.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(Buffer.from(value));
          }
        };
        await pump();
      } else {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);
      }
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    }

  } catch (error: any) {
    console.error("Download proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to download video" });
  }
});

app.post("/api/extract-video", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const encodedUrl = encodeURIComponent(url.trim());
    let extractedData = null;

    // 1. Try Cobalt API first
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          url: url.trim()
        })
      });

      if (cobaltRes.ok) {
        const data = await cobaltRes.json();
        if (data.status === 'stream' || data.status === 'redirect') {
          extractedData = {
            title: "Social Video",
            thumbnail: "https://picsum.photos/seed/video/400/600",
            videoUrl: data.url,
            source: "Cobalt"
          };
        } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
          const firstVideo = data.picker.find((item: any) => item.type === 'video') || data.picker[0];
          extractedData = {
            title: "Social Video",
            thumbnail: firstVideo.thumb || "https://picsum.photos/seed/video/400/600",
            videoUrl: firstVideo.url,
            source: "Cobalt"
          };
        }
      }
    } catch (e) {
      console.warn("Cobalt API failed", e);
    }

    // 2. TikTok Fallback
    if (!extractedData && url.includes('tiktok.com')) {
      try {
        const tikwmUrl = `https://www.tikwm.com/api/?url=${encodedUrl}`;
        const res = await fetch(tikwmUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.ok) {
          const parsed = await res.json();
          if (parsed.code === 0) {
            extractedData = {
              title: parsed.data.title || "TikTok Video",
              thumbnail: parsed.data.cover,
              videoUrl: parsed.data.play,
              source: "TikTok"
            };
          }
        }
      } catch (e) {
        console.warn("TikTok extraction failed", e);
      }
    }

    // 3. Instagram Fallback
    if (!extractedData && url.includes('instagram.com')) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (res.ok) {
          const html = await res.text();
          const videoMatch = html.match(/"video_url":"([^"]+)"/);
          const displayUrlMatch = html.match(/"display_url":"([^"]+)"/);
          const ogVideo = html.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i)?.[1];
          
          if (videoMatch || ogVideo) {
            extractedData = {
              title: "Instagram Video",
              thumbnail: displayUrlMatch ? displayUrlMatch[1].replace(/\\u0026/g, '&') : "https://picsum.photos/seed/insta/400/600",
              videoUrl: (videoMatch ? videoMatch[1] : ogVideo!).replace(/\\u0026/g, '&'),
              source: "Instagram"
            };
          }
        }
      } catch (e) {
        console.warn("Instagram extraction failed", e);
      }
    }

    // 4. YouTube Fallback
    if (!extractedData && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      try {
        const ytIdMatch = url.match(/(?:v=|\/shorts\/|\/embed\/|\/v\/|youtu\.be\/|\/watch\?v=|\/watch\?.+&v=)([^#&?]{11})/);
        if (ytIdMatch) {
          const videoId = ytIdMatch[1];
          const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          if (res.ok) {
            const data = await res.json();
            extractedData = {
              title: data.title || "YouTube Video",
              thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              source: "YouTube"
            };
          }
        }
      } catch (e) {
        console.warn("YouTube extraction failed", e);
      }
    }

    // 5. Generic OpenGraph Fallback
    if (!extractedData) {
      try {
        const fetchRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (fetchRes.status === 403 || fetchRes.status === 429) {
          return res.status(fetchRes.status).json({ error: `Access blocked by the platform (${fetchRes.status}). Please try again later or use an alternative tool like yt-dlp.` });
        }
        
        if (fetchRes.ok) {
          const html = await fetchRes.text();
          const ogVideo = html.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i)?.[1] ||
                          html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:video"/i)?.[1] ||
                          html.match(/<video[^>]+src="([^"]+)"/i)?.[1];
          const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ||
                          html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] ||
                          html.match(/<title>([^<]+)<\/title>/i)?.[1];
          const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ||
                          html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1];

          if (ogVideo) {
            extractedData = {
              title: ogTitle || "Social Video",
              thumbnail: ogImage || "https://picsum.photos/seed/video/400/600",
              videoUrl: ogVideo,
              source: "Social Media"
            };
          }
        }
      } catch (e) {
        console.warn("Generic extraction failed", e);
      }
    }

    if (extractedData) {
      return res.json(extractedData);
    } else {
      return res.status(404).json({ error: "Could not extract video. The platform might be blocking requests or the link is invalid. Try using a third-party tool like yt-dlp or a dedicated downloader site." });
    }
  } catch (error: any) {
    console.error("Extraction error:", error);
    if (error.response && (error.response.status === 403 || error.response.status === 429)) {
      return res.status(error.response.status).json({ error: "Access blocked by the platform (403/429). Please try again later or use an alternative tool like yt-dlp." });
    }
    return res.status(500).json({ error: "An error occurred while extracting video info." });
  }
});

export const handler = serverless(app);
