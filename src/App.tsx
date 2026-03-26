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

export default function App() {
  return (
    <ToolProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="themes" element={<Themes />} />
            <Route path="background-remover" element={<ToolActivator name="BG Remover" path="background-remover" />} />
            <Route path="qr-code-generator" element={<ToolActivator name="QR Generator" path="qr-code-generator" />} />
            <Route path="smart-code-generator" element={<ToolActivator name="Smart Code" path="smart-code-generator" />} />
            <Route path="code-base" element={<CodeBase />} />
            <Route path="pdf-converter" element={<ToolActivator name="PDF Converter" path="pdf-converter" />} />
            <Route path="whatsapp-s-create" element={<ToolActivator name="WA Sticker" path="whatsapp-s-create" />} />
            <Route path="image-dataset-collector" element={<ToolActivator name="Image Data-Set Collector" path="image-dataset-collector" />} />
            <Route path="wa-s-generator" element={<ToolActivator name="WA Generator" path="wa-s-generator" />} />
            <Route path="pfp-anima" element={<ToolActivator name="PFP Anima" path="pfp-anima" />} />
            <Route path="image-colourizer" element={<ToolActivator name="Image colorizer" path="image-colourizer" />} />
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
