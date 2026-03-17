import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTools } from '../context/ToolContext';

// Import all tools
import { BackgroundRemover } from "../pages/BackgroundRemover";
import { ImageUpscaler } from "../pages/ImageUpscaler";
import { ImageColorizer } from "../pages/ImageColorizer";
import { QrGenerator } from "../pages/QrGenerator";
import { SmartCodeGenerator } from "../pages/SmartCodeGenerator";
import { CodeBase } from "../pages/CodeBase";
import { PdfConverter } from "../pages/PdfConverter";
import { WhatsappSCreate } from "../pages/WhatsappSCreate";
import { WhatsappSCreateVideo } from "../pages/WhatsappSCreateVideo";
import { IDETool } from "../pages/IDETool";
import { ImageDatasetCollector } from "../pages/ImageDatasetCollector";
import { WASGenerator } from "../pages/WASGenerator";
import { PFPAnima } from "../pages/PFPAnima";
import { HtmlViewer } from "../pages/HtmlViewer";

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  'background-remover': BackgroundRemover,
  'image-upscaler': ImageUpscaler,
  'image-colorizer': ImageColorizer,
  'qr-code-generator': QrGenerator,
  'smart-code-generator': SmartCodeGenerator,
  'code-base': CodeBase,
  'pdf-converter': PdfConverter,
  'whatsapp-s-create': WhatsappSCreate,
  'whatsapp-s-create-video': WhatsappSCreateVideo,
  'ide-tool': IDETool,
  'image-dataset-collector': ImageDatasetCollector,
  'wa-s-generator': WASGenerator,
  'pfp-anima': PFPAnima,
  'html-viewer': HtmlViewer,
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
