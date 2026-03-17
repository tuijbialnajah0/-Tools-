import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where,
  Timestamp,
  getCountFromServer
} from "firebase/firestore";
import { db } from "../firebase";

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

let syncPromise: Promise<void> | null = null;

export async function syncDefaultTools(force = false) {
  if (syncPromise) return syncPromise;
  
  syncPromise = (async () => {
    try {
      const toolsRef = collection(db, "tools");
      
      if (force) {
        const toolsSnap = await getDocs(toolsRef);
        const existingNames = new Set(toolsSnap.docs.map(doc => doc.data().tool_name.toLowerCase()));
        
        for (const tool of DEFAULT_TOOLS) {
          if (!existingNames.has(tool.tool_name.toLowerCase())) {
            await addDoc(toolsRef, {
              ...tool,
              created_at: Timestamp.now()
            });
          }
        }
        return;
      }

      const countSnap = await getCountFromServer(toolsRef);
      if (countSnap.data().count === 0) {
        for (const tool of DEFAULT_TOOLS) {
          await addDoc(toolsRef, {
            ...tool,
            created_at: Timestamp.now()
          });
        }
      }
    } catch (err) {
      console.error("Failed to sync default tools:", err);
    } finally {
      syncPromise = null;
    }
  })();
  
  return syncPromise;
}
