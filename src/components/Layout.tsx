import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useTools } from "../context/ToolContext";
import { ToolManager } from "./ToolManager";
import { ThemeEffects } from "./ThemeEffects";
import {
  LayoutDashboard,
  Wrench,
  Menu,
  X,
  Sun,
  Moon,
  Image,
  Maximize,
  Palette,
  QrCode,
  FileCode,
  Terminal,
  FileText,
  MessageCircle,
  Activity,
  Video,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const TOOL_ICONS: Record<string, any> = {
  'background-remover': Image,
  'image-upscaler': Maximize,
  'image-colorizer': Palette,
  'qr-code-generator': QrCode,
  'smart-code-generator': FileCode,
  'code-base': Terminal,
  'pdf-converter': FileText,
  'whatsapp-s-create': MessageCircle,
  'whatsapp-s-create-video': Video,
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

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const navItems = [
    { name: "All Tools", href: "/", icon: LayoutDashboard },
    { name: "Themes", href: "/themes", icon: Palette },
  ];

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
    <div id="app-layout" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 relative">
      <ThemeEffects />
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
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

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform duration-300 md:translate-x-0 md:static md:h-screen",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 hidden md:flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
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
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
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
              {runningTools.map((tool) => {
                const isActive = location.pathname === `/${tool.path}`;
                const Icon = TOOL_ICONS[tool.path] || Wrench;
                return (
                  <div key={tool.id} className="group relative">
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
                  </div>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <a 
            href="https://chat.whatsapp.com/BBaVVm1n2WI4kzMcoeTqyl?mode=gi_t" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Report Bug
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950 relative z-10">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <Outlet />
          <ToolManager />
        </div>
      </main>
    </div>
  );
}
