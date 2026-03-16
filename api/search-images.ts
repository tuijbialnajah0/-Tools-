import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    
    if (!vqdMatch) {
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
}
