import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

export type ThemeType = 
  | "slate" | "petals" | "sakura" | "dandelions" | "feathers" 
  | "hearts" | "lanterns" | "clouds" | "maple" | "lotus" 
  | "magic" | "fireflies_forest" | "bubbles_ocean"
  | "marin" | "makima" | "zero_two" | "frieren" | "sketch";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: { id: ThemeType; name: string; color: string; isAnimated?: boolean; isSpecial?: boolean }[] = [
  { id: "slate", name: "Default Slate", color: "#64748b" },
  { id: "petals", name: "Pink Petals", color: "#fda4af", isAnimated: true },
  { id: "sakura", name: "Sakura Storm", color: "#f9a8d4", isAnimated: true },
  { id: "dandelions", name: "Dandelions", color: "#fef08a", isAnimated: true },
  { id: "feathers", name: "Floating Feathers", color: "#e2e8f0", isAnimated: true },
  { id: "hearts", name: "Floating Hearts", color: "#fb7185", isAnimated: true },
  { id: "lanterns", name: "Magic Lanterns", color: "#fbbf24", isAnimated: true },
  { id: "clouds", name: "Soft Clouds", color: "#bae6fd", isAnimated: true },
  { id: "maple", name: "Maple Drift", color: "#f97316", isAnimated: true },
  { id: "lotus", name: "Lotus Float", color: "#d8b4fe", isAnimated: true },
  { id: "magic", name: "Magic Dust", color: "#a5b4fc", isAnimated: true },
  { id: "fireflies_forest", name: "Fireflies Forest", color: "#4ade80", isAnimated: true },
  { id: "bubbles_ocean", name: "Ocean Bubbles", color: "#38bdf8", isAnimated: true },
  { id: "marin", name: "Marin Kitagawa", color: "#f472b6", isSpecial: true },
  { id: "makima", name: "Makima Style", color: "#991b1b", isSpecial: true },
  { id: "zero_two", name: "Zero Two", color: "#f43f5e", isSpecial: true },
  { id: "frieren", name: "Frieren Style", color: "#818cf8", isSpecial: true },
  { id: "sketch", name: "Sketch Style", color: "#4b5563", isSpecial: true },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app-theme") as ThemeType) || "slate";
    }
    return "slate";
  });

  // Sync theme from user profile when it loads
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setThemeState(user.theme as ThemeType);
      localStorage.setItem("app-theme", user.theme);
    }
  }, [user?.theme]);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
    
    if (user) {
      // Optimistically update local user state
      updateUser({ theme: newTheme });
      
      // Update in Supabase
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ theme: newTheme })
          .eq("id", user.id);
          
        if (error) {
          console.error("Failed to save theme to Supabase:", error);
        }
      } catch (err) {
        console.error("Error saving theme:", err);
      }
    }
  };

  useEffect(() => {
    // Remove all theme classes
    const root = document.documentElement;
    themes.forEach(t => root.classList.remove(`theme-${t.id}`));
    // Add new theme class
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
