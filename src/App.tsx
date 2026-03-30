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
import ImageUpscaler from "./pages/ImageUpscaler";
import { WASGenerator } from "./pages/WASGenerator";
import { PFPAnima } from "./pages/PFPAnima";
import ImageColourizer from "./pages/ImageColourizer";
import ApiTester from "./pages/ApiTester";
import AudioVisualiser from "./pages/AudioVisualiser";
import EmojiStickerPacker from "./pages/EmojiStickerPacker";
import { FancyFontGenerator } from "./pages/FancyFontGenerator";
import { PdfToImage } from "./pages/PdfToImage";
import { VideoCompressor } from "./pages/VideoCompressor";
import VideoStoryboard from "./pages/VideoStoryboard";
import { YouTubeMultiView } from "./pages/YouTubeMultiView";
import BulkImageRotator from "./pages/BulkImageRotator";
import BulkMetadataRemover from "./pages/BulkMetadataRemover";
import { PFPAnimaRemastered } from "./pages/PFPAnimaRemastered";
import DuplicateImageFinder from "./pages/DuplicateImageFinder";

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
            <Route path="image-upscaler" element={<ImageUpscaler />} />
            <Route path="wa-s-generator" element={<WASGenerator />} />
            <Route path="pfp-anima" element={<PFPAnima />} />
            <Route path="pfp-anima-remastered" element={<PFPAnimaRemastered />} />
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
            <Route path="emoji-sticker-packer" element={<EmojiStickerPacker />} />
            <Route path="fancy-font-generator" element={<FancyFontGenerator />} />
            <Route path="pdf-to-image" element={<PdfToImage />} />
            <Route path="video-compressor" element={<VideoCompressor />} />
            <Route path="video-storyboard" element={<VideoStoryboard />} />
            <Route path="youtube-multiview" element={<YouTubeMultiView />} />
            <Route path="bulk-image-rotator" element={<BulkImageRotator />} />
            <Route path="bulk-metadata-remover" element={<BulkMetadataRemover />} />
            <Route path="duplicate-image-finder" element={<DuplicateImageFinder />} />
            
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
