import React, { useState, useEffect } from 'react';
import { Palette, CheckCircle2 } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Themes() {
  const [activeTheme, setActiveTheme] = useState<string | null>(
    localStorage.getItem('app-theme') || null
  );

  const handleThemeSelect = (themeId: string | null) => {
    setActiveTheme(themeId);
    if (themeId) {
      localStorage.setItem('app-theme', themeId);
    } else {
      localStorage.removeItem('app-theme');
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  return (
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
          <Palette className="w-8 h-8 mr-3 text-indigo-600" />
          Themes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Customize the look and feel of the application.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Default Theme */}
        <div 
          onClick={() => handleThemeSelect(null)}
          className={cn(
            "cursor-pointer rounded-2xl border-2 p-6 transition-all hover:shadow-md",
            activeTheme === null 
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300"
          )}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Default</h3>
            {activeTheme === null && <CheckCircle2 className="w-6 h-6 text-indigo-600" />}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Standard clean interface without any special effects.
          </p>
        </div>

        {/* Pink Petals Theme */}
        <div 
          onClick={() => handleThemeSelect('pink-petals')}
          className={cn(
            "cursor-pointer rounded-2xl border-2 p-6 transition-all hover:shadow-md",
            activeTheme === 'pink-petals' 
              ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20" 
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-pink-300"
          )}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pink Petals</h3>
            {activeTheme === 'pink-petals' && <CheckCircle2 className="w-6 h-6 text-pink-500" />}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Beautiful falling pink sakura petals across the screen.
          </p>
        </div>
      </div>
    </div>
  );
}
