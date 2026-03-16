import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTools } from "../context/ToolContext";
import { ToolManager } from "./ToolManager";
import {
  User,
  Trophy,
  LayoutDashboard,
  Wrench,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Send,
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
  Heart,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SendCreditModal } from "./SendCreditModal";
import { supabase } from "../lib/supabase";

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
  'ide-tool': LayoutDashboard,
  'html-viewer': FileCode,
};

export function Layout() {
  const { user, logout } = useAuth();
  const { runningTools, removeTool } = useTools();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSendCreditModalOpen, setIsSendCreditModalOpen] = useState(false);
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
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Favorites", href: "/favorites", icon: Heart },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const adminItems = [
    { name: "Admin Overview", href: "/admin", icon: Settings },
    { name: "Manage Users", href: "/admin/users", icon: Users },
    { name: "Manage Tools", href: "/admin/tools", icon: Wrench },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center">
          <Wrench className="w-6 h-6 text-indigo-600 mr-2" />
          <span className="text-lg font-semibold text-slate-900 dark:text-white">𝙱𝙹𝙴 ~ Tools</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full mr-1 border border-indigo-100 dark:border-indigo-800/50">
            <span className="mr-1.5">💳</span>
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {user?.role === "admin" ? "Infinite" : user?.credit_balance}
            </span>
          </div>
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

          {user?.role === "admin" && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {adminItems.map((item) => {
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
            </>
          )}

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Actions
            </p>
          </div>
          <button
            onClick={() => {
              closeSidebar();
              setIsSendCreditModalOpen(true);
            }}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Send className="w-5 h-5 mr-3 text-slate-400 dark:text-slate-500" />
            Send Credit
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Total Credits Spent
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                💳 {(user?.total_spent || 0).toFixed(0)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <Link to="/profile" className="flex items-center group">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden mr-3 group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                <img 
                  src={user?.avatar_url || `https://api.dicebear.com/7.x/lorelei/svg?seed=${user?.id}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px]">
                  {user?.username || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  View Profile
                </span>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 items-center justify-end px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40">
          <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
            <span className="mr-2">💳</span>
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {user?.role === "admin" ? "Infinite Credits" : `${user?.credit_balance} Credits`}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <Outlet />
          <ToolManager />
        </div>
      </main>

      <SendCreditModal 
        isOpen={isSendCreditModalOpen} 
        onClose={() => setIsSendCreditModalOpen(false)} 
      />
    </div>
  );
}
