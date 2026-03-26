import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTools } from '../context/ToolContext';

// Import all tools
import { BackgroundRemover } from "../pages/BackgroundRemover";
import { QrGenerator } from "../pages/QrGenerator";
import { SmartCodeGenerator } from "../pages/SmartCodeGenerator";
import { PdfConverter } from "../pages/PdfConverter";
import { WhatsappSCreate } from "../pages/WhatsappSCreate";
import { ImageDatasetCollector } from "../pages/ImageDatasetCollector";
import { WASGenerator } from "../pages/WASGenerator";
import { PFPAnima } from "../pages/PFPAnima";
import ImageColourizer from "../pages/ImageColourizer";
// import { OfflineBackgroundRemover } from "../pages/OfflineBackgroundRemover";

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  'background-remover': BackgroundRemover,
  // 'offline-background-remover': OfflineBackgroundRemover,
  'qr-code-generator': QrGenerator,
  'smart-code-generator': SmartCodeGenerator,
  'pdf-converter': PdfConverter,
  'whatsapp-s-create': WhatsappSCreate,
  'image-dataset-collector': ImageDatasetCollector,
  'wa-s-generator': WASGenerator,
  'pfp-anima': PFPAnima,
  'image-colourizer': ImageColourizer,
};

export function ToolManager() {
  const location = useLocation();
  const { runningTools } = useTools();
  
  const currentPath = location.pathname.replace(/^\//, '');

  return (
    <>
      {runningTools.map((tool) => {
        const Component = TOOL_COMPONENTS[tool.path];
        if (!Component) return null;
        
        const isActive = currentPath === tool.path;
        
        return (
          <div 
            key={tool.id} 
            className={isActive ? "block h-full w-full" : "hidden"}
          >
            <Component />
          </div>
        );
      })}
    </>
  );
}
