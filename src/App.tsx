/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ToolProvider } from "./context/ToolContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Themes } from "./pages/Themes";
import { ToolActivator } from "./components/ToolActivator";
import { TextViewer } from "./pages/TextViewer";
import NotesCreate from "./pages/NotesCreate";
import NotesViewer from "./pages/NotesViewer";
import TextToCinematicNotes from "./pages/TextToCinematicNotes";
import { HtmlViewer } from "./pages/HtmlViewer";
import TextToImage from "./pages/TextToImage";
import { CodeBase } from "./pages/CodeBase";
import ImageCompressor from "./pages/ImageCompressor";
import BulkImageCompressor from "./pages/BulkImageCompressor";
import { CodeFormatter } from "./pages/CodeFormatter";
import { ImageToText } from "./pages/ImageToText";
import { DocumentToText } from "./pages/DocumentToText";
import ImageFormatter from "./pages/ImageFormatter";
import WordCounter from "./pages/WordCounter";
import { FaviconGenerator } from "./pages/FaviconGenerator";
import VideoToAudio from "./pages/VideoToAudio";
import ColorPalette from "./pages/ColorPalette";
import EmojiArtGenerator from "./pages/EmojiArtGenerator";
import { BackgroundRemover } from "./pages/BackgroundRemover";
import { QrGenerator } from "./pages/QrGenerator";
import { SmartCodeGenerator } from "./pages/SmartCodeGenerator";
import { PdfConverter } from "./pages/PdfConverter";
import { WhatsappSCreate } from "./pages/WhatsappSCreate";
import { ImageDatasetCollector } from "./pages/ImageDatasetCollector";
import { WASGenerator } from "./pages/WASGenerator";
import { PFPAnima } from "./pages/PFPAnima";
import ImageColourizer from "./pages/ImageColourizer";
import ApiTester from "./pages/ApiTester";
import AudioVisualiser from "./pages/AudioVisualiser";

export default function App() {
  return (
    <ToolProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="themes" element={<Themes />} />
            <Route path="background-remover" element={<BackgroundRemover />} />
            <Route path="qr-code-generator" element={<QrGenerator />} />
            <Route path="smart-code-generator" element={<SmartCodeGenerator />} />
            <Route path="code-base" element={<CodeBase />} />
            <Route path="pdf-converter" element={<PdfConverter />} />
            <Route path="whatsapp-s-create" element={<WhatsappSCreate />} />
            <Route path="image-dataset-collector" element={<ImageDatasetCollector />} />
            <Route path="wa-s-generator" element={<WASGenerator />} />
            <Route path="pfp-anima" element={<PFPAnima />} />
            <Route path="image-colourizer" element={<ImageColourizer />} />
            <Route path="notes-create" element={<NotesCreate />} />
            <Route path="notes-viewer" element={<NotesViewer />} />
            <Route path="text-to-cinematic-notes" element={<TextToCinematicNotes />} />
            <Route path="html-viewer" element={<HtmlViewer />} />
            <Route path="text-to-image" element={<TextToImage />} />
            <Route path="image-compressor" element={<ImageCompressor />} />
            <Route path="bulk-image-compressor" element={<BulkImageCompressor />} />
            <Route path="code-formatter" element={<CodeFormatter />} />
            <Route path="image-to-text" element={<ImageToText />} />
            <Route path="document-to-text" element={<DocumentToText />} />
            <Route path="image-formatter" element={<ImageFormatter />} />
            <Route path="word-counter" element={<WordCounter />} />
            <Route path="favicon-generator" element={<FaviconGenerator />} />
            <Route path="video-to-audio" element={<VideoToAudio />} />
            <Route path="color-palette" element={<ColorPalette />} />
            <Route path="emoji-art" element={<EmojiArtGenerator />} />
            <Route path="api-tester" element={<ApiTester />} />
            <Route path="audio-visualiser" element={<AudioVisualiser />} />
            
            <Route path="text-viewer" element={<TextViewer />} />
            
            {/* Catch-all for unimplemented tools */}
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToolProvider>
  );
}
