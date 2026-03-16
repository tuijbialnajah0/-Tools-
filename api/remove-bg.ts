import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        }
      } catch (e) {
        console.error('BriaAI error:', e);
      }
    }

    return res.status(500).json({ error: "All premium APIs failed or no keys configured" });

  } catch (err: any) {
    console.error("API error:", err);
    res.status(500).json({ error: err.message });
  }
}
