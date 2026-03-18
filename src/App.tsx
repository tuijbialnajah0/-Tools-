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
import { db } from "./firebase";
import { getDoc, doc } from "firebase/firestore";

function DatabaseCheck({ children }: { children: React.ReactNode }) {
  const [dbError, setDbError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [retryCount, setRetryCount] = React.useState(0);

  const checkDb = React.useCallback(async () => {
    setChecking(true);
    setDbError(null);
    try {
      // Try to fetch a non-existent document to test connection
      // We use a short timeout to detect "offline" faster
      const testDoc = doc(db, "_connection_test_", "test");
      await getDoc(testDoc);
      setDbError(null);
    } catch (err: any) {
      console.error("Database connection test failed:", err);
      const isPermissionError = err.code === "permission-denied" || 
                               (err.message && err.message.toLowerCase().includes("permission"));
      
      if (isPermissionError) {
        // Permission denied means the database exists and rules are working!
        setDbError(null);
      } else if (err.message && (err.message.includes("database (default) does not exist") || err.message.includes("client is offline"))) {
        setDbError(err.message.includes("database (default) does not exist") 
          ? "The Firestore database '(default)' does not exist for this project. Please ensure you created it in the Firebase Console."
          : "The Firestore client is reporting as 'offline'. This usually means the database is not accessible or your network is blocking the connection.");
      } else {
        setDbError(err.message || "An unknown error occurred while connecting to the database.");
      }
    } finally {
      setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    checkDb();
  }, [checkDb, retryCount]);

  if (checking && !dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Connecting to database...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-red-200 dark:border-red-900/50 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Connection Error</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{dbError}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => setRetryCount(prev => prev + 1)}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              Retry Connection
            </button>
            <a 
              href="https://console.firebase.google.com/project/bjetools/firestore" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Open Firebase Console
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

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
    <DatabaseCheck>
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
    </DatabaseCheck>
  );
}
