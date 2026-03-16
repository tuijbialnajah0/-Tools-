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
      'Referer': 'https://duckduckgo.com/',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // Add a small random delay to avoid rapid-fire detection
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Use DuckDuckGo's internal API for faster results
    // First, get the VQD token
    const vqdResponse = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, { headers });
    if (!vqdResponse.ok) {
      throw new Error(`Failed to initialize search (Status: ${vqdResponse.status})`);
    }
    
    const vqdText = await vqdResponse.text();
    
    // Try multiple regex patterns for VQD
    let vqdMatch = vqdText.match(/vqd=([^&'"]+)/);
    if (!vqdMatch) {
      vqdMatch = vqdText.match(/vqd\s*[:=]\s*['"]([^'"]+)['"]/);
    }
    
    if (!vqdMatch) {
      console.warn("VQD not found, falling back to HTML search");
      const htmlUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${start}&kp=${safeSearch}`;
      const htmlRes = await fetch(htmlUrl, { headers });
      if (!htmlRes.ok) throw new Error(`HTML search failed (Status: ${htmlRes.status})`);
      const html = await htmlRes.text();
      return res.json({ html, source: 'ddg-html' });
    }

    const vqd = vqdMatch[1];
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&s=${start}`;
    
    const apiRes = await fetch(apiUrl, { headers });
    if (!apiRes.ok) {
      console.warn(`API search failed (Status: ${apiRes.status}), falling back to HTML`);
      const htmlUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${start}&kp=${safeSearch}`;
      const htmlRes = await fetch(htmlUrl, { headers });
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
}
