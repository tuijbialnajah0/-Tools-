import React, { useState, useEffect } from "react";
import { Play, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Tool = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const tools: Tool[] = [
    { id: 'background-remover', name: 'Background Remover', description: 'Remove backgrounds from images automatically using AI. [STATUS:development]', category: 'Image' },
    { id: 'image-upscaler', name: 'Image Upscaler', description: 'Upscale and enhance image quality. [STATUS:development]', category: 'Image' },
    { id: 'image-colorizer', name: 'Image Colorizer', description: 'Add color to black and white photos. [STATUS:development]', category: 'Image' },
    { id: 'qr-code-generator', name: 'QR Code Generator', description: 'Generate custom QR codes for any URL. [STATUS:working]', category: 'Utility' },
    { id: 'smart-code-generator', name: 'Smart Code Generator', description: 'AI-powered code generation for developers. [STATUS:working]', category: 'Developer' },
    { id: 'code-base', name: 'Code base', description: 'Manage and explore your code snippets. [STATUS:development]', category: 'Developer' },
    { id: 'pdf-converter', name: 'Pdf Converter', description: 'Convert documents to and from PDF format. [STATUS:working]', category: 'Utility' },
    { id: 'whatsapp-s-create', name: 'Whatsapp-S-Create', description: 'Create custom stickers for WhatsApp. [STATUS:working]', category: 'Social' },
    { id: 'whatsapp-s-create-video', name: 'Whatsapp-S-Create Video', description: 'Create video stickers for WhatsApp. [STATUS:working]', category: 'Social' },
    { id: 'image-dataset-collector', name: 'Image Dataset Collector', description: 'Collect and manage image datasets. [STATUS:development]', category: 'Utility' },
    { id: 'wa-s-generator', name: 'WA ~ S generator', description: 'WhatsApp sticker generation tool. [STATUS:working]', category: 'Social' },
    { id: 'pfp-anima', name: 'PFP Anima', description: 'Animate your profile pictures. [STATUS:working]', category: 'Image' },
  ];

  const handleExecute = (tool: Tool) => {
    const toolName = (tool.name || "").trim();
    if (!toolName) return;
    
    const explicitMappings: Record<string, string> = {
      "Background Remover": "/background-remover",
      "Whatsapp-S-Create": "/whatsapp-s-create",
      "Image Upscaler": "/image-upscaler",
      "Image Colorizer": "/image-colorizer",
      "QR Code Generator": "/qr-code-generator",
      "Smart Code Generator": "/smart-code-generator",
      "Code base": "/code-base",
      "Pdf Converter": "/pdf-converter",
      "Whatsapp-S-Create Video": "/whatsapp-s-create-video",
      "Image Dataset Collector": "/image-dataset-collector",
      "WA ~ S generator": "/wa-s-generator",
      "PFP Anima": "/pfp-anima"
    };

    if (explicitMappings[toolName]) {
      navigate(explicitMappings[toolName]);
    } else {
      const slug = toolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      navigate(`/${slug}`);
    }
  };

  const categories = Array.from(new Set(tools.map((t) => t.category))).filter(Boolean);
  
  const filteredTools = selectedCategory === "All" 
    ? tools 
    : tools.filter(t => t.category === selectedCategory);

  const workingTools = filteredTools.filter(t => t.description.includes('[STATUS:working]'));
  const devTools = filteredTools.filter(t => t.description.includes('[STATUS:development]'));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Tools Directory</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("All")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === "All"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        {workingTools.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              Working Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {workingTools.map((tool) => (
                <ToolCard 
                  key={tool.id} 
                  tool={tool} 
                  onExecute={handleExecute} 
                />
              ))}
            </div>
          </section>
        )}

        {devTools.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-3 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
              In Development
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 opacity-80 hover:opacity-100 transition-opacity duration-300">
              {devTools.map((tool) => (
                <ToolCard 
                  key={tool.id} 
                  tool={tool} 
                  onExecute={handleExecute} 
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ToolCard({ 
  tool, 
  onExecute 
}: { 
  tool: Tool; 
  onExecute: (tool: Tool) => void;
}) {
  const statusMatch = tool.description.match(/\[STATUS:(working|development)\]/);
  const status = statusMatch ? statusMatch[1] : 'working';
  const cleanDesc = tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim();

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative group"
    >
      <div className="absolute top-4 right-4">
        {status === 'working' ? (
          <span className="flex items-center text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
            Working
          </span>
        ) : (
          <span className="flex items-center text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
            In Dev
          </span>
        )}
      </div>
      <div className="flex-1 mt-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{tool.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
          {cleanDesc}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
        <button
          onClick={() => onExecute(tool)}
          className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
        >
          <Play className="w-4 h-4 mr-2" /> Launch Tool
        </button>
      </div>
    </div>
  );
}
