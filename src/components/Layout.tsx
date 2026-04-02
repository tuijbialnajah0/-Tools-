import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useTools } from "../context/ToolContext";
import { ToolManager } from "./ToolManager";
import { ThemeEffects } from "./ThemeEffects";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Wrench, Menu, X, Sun, Moon, Image, Maximize, Palette, QrCode, FileCode, Terminal, FileText, MessageCircle, Activity, Video, AlertCircle, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { usageService } from "../services/usageService";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const TOOL_ICONS: Record<string, any> = {
  'background-remover': Image,
  'offline-background-remover': Image,
  'qr-code-generator': QrCode,
  'smart-code-generator': FileCode,
  'pdf-converter': FileText,
  'whatsapp-s-create': MessageCircle,
  'whatsapp-s-create-video': Video,
  'image-colourizer': Image,
};

export function Layout() {
  const { runningTools, removeTool } = useTools();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Track tool usage on route change
  useEffect(() => {
    const path = location.pathname.slice(1);
    // Only track if it's a tool path (not dashboard, themes, or empty)
    if (path && path !== 'themes' && path !== '') {
      usageService.incrementUsage(path);
    }
  }, [location.pathname]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const navItems = [
    { name: "All Tools", href: "/", icon: LayoutDashboard },
    { name: "Themes", href: "/themes", icon: Palette },
  ];

  const reportBugUrl = "https://chat.whatsapp.com/BBaVVm1n2WI4kzMcoeTqyl?mode=gi_t";

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleCloseTool = (e: React.MouseEvent, toolId: string, toolPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeTool(toolId);
    if (location.pathname === `/${toolPath}`) {
      navigate('/');
    }
  };

  return (
    <div id="app-layout" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-rose-400/20 blur-[100px] animate-pulse delay-700" />
      </div>
      <ThemeEffects />
      {/* Mobile Header */}
      <header className="md:hidden h-16 glass border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center">
          <Wrench className="w-6 h-6 text-indigo-600 mr-2" />
          <span className="text-lg font-semibold text-slate-900 dark:text-white">𝙱𝙹𝙴 ~ Tools</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Popup */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] md:hidden flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={closeSidebar}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm glass border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center">
                  <Wrench className="w-6 h-6 text-indigo-600 mr-2" />
                  <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">𝙱𝙹𝙴 ~ Menu</span>
                </div>
                <button
                  onClick={closeSidebar}
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="p-6 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all",
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 mr-3",
                          isActive ? "text-white" : "text-slate-400 dark:text-slate-500",
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}

                {runningTools.length > 0 && (
                  <>
                    <div className="pt-6 pb-2">
                      <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                        <Activity className="w-3 h-3 mr-1.5" />
                        Running Services
                      </p>
                    </div>
                    {runningTools.map((tool) => {
                      const isActive = location.pathname === `/${tool.path}`;
                      const Icon = TOOL_ICONS[tool.path] || Wrench;
                      return (
                        <div key={tool.id} className="group relative">
                          <Link
                            to={`/${tool.path}`}
                            onClick={closeSidebar}
                            className={cn(
                              "flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all pr-12",
                              isActive
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-5 h-5 mr-3",
                                isActive ? "text-white" : "text-slate-400 dark:text-slate-500",
                              )}
                            />
                            <span className="truncate">{tool.name}</span>
                          </Link>
                          <button
                            onClick={(e) => handleCloseTool(e, tool.id, tool.path)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="pt-6">
                  <a
                    href={reportBugUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30"
                    onClick={closeSidebar}
                  >
                    <AlertCircle className="w-5 h-5 mr-3" />
                    Report Bug
                  </a>
                </div>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex w-64 glass border-r border-slate-200/50 dark:border-slate-800/50 flex-col h-screen sticky top-0",
        )}
      >
        <div className="h-16 hidden md:flex items-center justify-between px-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center">
            <Wrench className="w-6 h-6 text-indigo-600 mr-2" />
            <span className="text-lg font-semibold text-slate-900 dark:text-white">𝙱𝙹𝙴 ~ Tools</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
              >
                <Link
                  to={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 mr-3",
                      isActive ? "text-indigo-700 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500",
                    )}
                  />
                  {item.name}
                </Link>
              </motion.div>
            );
          })}

          {/* Running Services */}
          {runningTools.length > 0 && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
                  <Activity className="w-3 h-3 mr-1.5" />
                  Running Services
                </p>
              </div>
              {runningTools.map((tool, idx) => {
                const isActive = location.pathname === `/${tool.path}`;
                const Icon = TOOL_ICONS[tool.path] || Wrench;
                return (
                  <motion.div 
                    key={tool.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="group relative"
                  >
                    <Link
                      to={`/${tool.path}`}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors pr-10",
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mr-3",
                          isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500",
                        )}
                      />
                      <span className="truncate">{tool.name}</span>
                    </Link>
                    <button
                      onClick={(e) => handleCloseTool(e, tool.id, tool.path)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all"
                      title="Close Service"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </>
          )}

          <div className="pt-6">
            <a
              href={reportBugUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={closeSidebar}
            >
              <AlertCircle className="w-5 h-5 mr-3" />
              Report Bug
            </a>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              𝙱𝙹𝙴 ~ Tools
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent relative z-10">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative flex flex-col custom-scrollbar">
          {location.pathname !== '/' && (
            <div className="mb-6 flex-shrink-0 flex items-center">
              <Link 
                to="/" 
                className="inline-flex items-center justify-center w-10 h-10 rounded-full glass shadow-sm border border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                title="Back to Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </Link>
              <span className="ml-3 text-sm font-medium text-slate-500 dark:text-slate-400">Back to Dashboard</span>
            </div>
          )}
          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <Outlet />
          </motion.div>
          <ToolManager />
        </div>
      </main>
    </div>
  );
}
