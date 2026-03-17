/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToolProvider } from "./context/ToolContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { ToolActivator } from "./components/ToolActivator";
import { Profile } from "./pages/Profile";
import { Leaderboard } from "./pages/Leaderboard";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminTools } from "./pages/admin/AdminTools";
import { Favorites } from "./pages/Favorites";

function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, loading, isAuthReady } = useAuth();

  // If we're still checking auth and don't have a cached user, return null to avoid flashing
  if ((loading || !isAuthReady) && !user) {
    return null;
  }

  // Once auth is ready (or we have a cached user), check if we should redirect
  if (!user && isAuthReady) return <Navigate to="/login" />;
  if (requireAdmin && user?.role !== "admin") return <Navigate to="/" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToolProvider>
        <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
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
                <Route path="favorites" element={<Favorites />} />
                <Route path="profile" element={<Profile />} />
                <Route path="leaderboard" element={<Leaderboard />} />

                {/* Admin Routes */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/tools"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminTools />
                  </ProtectedRoute>
                }
              />
              
              {/* Catch-all for unimplemented tools */}
              <Route 
                path="*" 
                element={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Coming Soon</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                      This tool is currently under development. Please check back later for updates!
                    </p>
                    <Link 
                      to="/" 
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Return to Dashboard
                    </Link>
                  </div>
                } 
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToolProvider>
    </AuthProvider>
  );
}
