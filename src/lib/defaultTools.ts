import { supabase } from "./supabase";

export const DEFAULT_TOOLS = [
  { tool_name: "Image Colorizer", description: "Convert black and white images to color using local processing. [STATUS:working]", credit_cost: 15, category: "Image Processing", enabled: true },
  { tool_name: "QR Code Generator", description: "Instantly create custom QR codes offline. [STATUS:working]", credit_cost: 5, category: "Utilities", enabled: true },
  { tool_name: "Smart Code Generator", description: "Detect programming languages and convert pasted code into downloadable files. [STATUS:working]", credit_cost: 5, category: "Developer Tools", enabled: true },
  { tool_name: "Code base", description: "Your AI coding assistant powered by Gemini 3.1 Pro. [STATUS:working]", credit_cost: 10, category: "Developer Tools", enabled: true },
  { tool_name: "Whatsapp-S-Create", description: "Create WhatsApp sticker packs from your pictures. [STATUS:working]", credit_cost: 150, category: "Utilities", enabled: true },
  { tool_name: "Whatsapp-S-Create Video", description: "Create animated WhatsApp sticker packs from your video clips. [STATUS:working]", credit_cost: 350, category: "Utilities", enabled: true },
  { tool_name: "Background Remover", description: "Remove backgrounds from images instantly. [STATUS:working]", credit_cost: 10, category: "Image Processing", enabled: true },
  { tool_name: "Image Upscaler", description: "Enhance image resolution and quality. [STATUS:working]", credit_cost: 20, category: "Image Processing", enabled: true },
  { tool_name: "Pdf Converter", description: "Convert images and documents to PDF format. [STATUS:working]", credit_cost: 15, category: "Utilities", enabled: true },
  { tool_name: "Integrated Development Environment (IDE)", description: "A complete browser-based IDE for HTML, CSS, and JavaScript with live preview. [STATUS:working]", credit_cost: 0, category: "Developer Tools", enabled: true },
  { tool_name: "Image Dataset Collector", description: "Search and download large image datasets from multiple public sources. [STATUS:working]", credit_cost: 20, category: "Utilities", enabled: true },
  { tool_name: "WA ~ S generator", description: "Search images and automatically generate WhatsApp sticker packs. [STATUS:working]", credit_cost: 1500, category: "Utilities", enabled: true },
  { tool_name: "PFP Anima", description: "Browse and download high-quality anime profile pictures and wallpapers. [STATUS:working]", credit_cost: 100, category: "Utilities", enabled: true },
  { tool_name: "Html viewer", description: "View and run HTML code with live preview and file support. [STATUS:working]", credit_cost: 0, category: "Developer Tools", enabled: true }
];

let isSyncing = false;
let syncPromise: Promise<void> | null = null;

export async function syncDefaultTools(force = false) {
  if (syncPromise) return syncPromise;
  
  syncPromise = (async () => {
    try {
      if (force) {
        const { data: existingTools } = await supabase.from("tools").select("tool_name");
        const existingNames = new Set(existingTools?.map(t => t.tool_name.toLowerCase()) || []);
        const missingTools = DEFAULT_TOOLS.filter(t => !existingNames.has(t.tool_name.toLowerCase()));
        
        if (missingTools.length > 0) {
          await supabase.from("tools").insert(missingTools);
        }
        return;
      }

      // Only sync if the tools table is empty to avoid overwriting admin choices (deletions/disabling)
      const { count, error: countError } = await supabase
        .from("tools")
        .select("*", { count: 'exact', head: true });
      
      if (countError) return;

      if (count === 0) {
        await supabase.from("tools").insert(DEFAULT_TOOLS);
      }
    } catch (err) {
      console.error("Failed to sync default tools:", err);
    } finally {
      syncPromise = null;
    }
  })();
  
  return syncPromise;
}
