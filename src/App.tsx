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

export default function App() {
  return (
    <ToolProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="themes" element={<Themes />} />
            <Route path="background-remover" element={<ToolActivator name="Background Remover" path="background-remover" />} />
            <Route path="image-upscaler" element={<ToolActivator name="Image Upscaler" path="image-upscaler" />} />
            <Route path="image-colorizer" element={<ToolActivator name="Image Colorizer" path="image-colorizer" />} />
            <Route path="qr-code-generator" element={<ToolActivator name="QR Code Generator" path="qr-code-generator" />} />
            <Route path="smart-code-generator" element={<ToolActivator name="Smart Code Generator" path="smart-code-generator" />} />
            <Route path="code-base" element={<ToolActivator name="Code base" path="code-base" />} />
            <Route path="pdf-converter" element={<ToolActivator name="Pdf Converter" path="pdf-converter" />} />
            <Route path="whatsapp-s-create" element={<ToolActivator name="Whatsapp-S-Create" path="whatsapp-s-create" />} />
            <Route path="whatsapp-s-create-video" element={<ToolActivator name="Whatsapp-S-Create Video" path="whatsapp-s-create-video" />} />
            <Route path="image-dataset-collector" element={<ToolActivator name="Image Dataset Collector" path="image-dataset-collector" />} />
            <Route path="wa-s-generator" element={<ToolActivator name="WA ~ S generator" path="wa-s-generator" />} />
            <Route path="pfp-anima" element={<ToolActivator name="PFP Anima" path="pfp-anima" />} />
            
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
