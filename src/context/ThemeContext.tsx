import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeType = 
  | "slate" | "midnight" | "emerald" | "rose" | "amber" 
  | "violet" | "ocean" | "forest" | "sunset" | "cyberpunk" 
  | "minimalist" | "coffee" | "lavender" | "crimson" | "gold"
  | "petals" | "constellation" | "water" | "snow" | "matrix"
  | "fireflies" | "stars" | "bubbles" | "confetti";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: { id: ThemeType; name: string; color: string; isAnimated?: boolean }[] = [
  { id: "slate", name: "Classic Slate", color: "#64748b" },
  { id: "midnight", name: "Midnight Blue", color: "#1e293b" },
  { id: "emerald", name: "Emerald Green", color: "#10b981" },
  { id: "rose", name: "Rose Pink", color: "#f43f5e" },
  { id: "amber", name: "Amber Gold", color: "#f59e0b" },
  { id: "violet", name: "Deep Violet", color: "#8b5cf6" },
  { id: "ocean", name: "Ocean Breeze", color: "#0ea5e9" },
  { id: "forest", name: "Deep Forest", color: "#065f46" },
  { id: "sunset", name: "Sunset Glow", color: "#f97316" },
  { id: "cyberpunk", name: "Cyberpunk Neon", color: "#ff00ff" },
  { id: "minimalist", name: "Minimalist", color: "#d1d5db" },
  { id: "coffee", name: "Roasted Coffee", color: "#78350f" },
  { id: "lavender", name: "Lavender", color: "#a78bfa" },
  { id: "crimson", name: "Crimson Red", color: "#991b1b" },
  { id: "gold", name: "Luxury Gold", color: "#fbbf24" },
  { id: "petals", name: "Flower Petals", color: "#fda4af", isAnimated: true },
  { id: "constellation", name: "Constellation", color: "#1e1b4b", isAnimated: true },
  { id: "water", name: "Water Ripples", color: "#3b82f6", isAnimated: true },
  { id: "snow", name: "Falling Snow", color: "#f8fafc", isAnimated: true },
  { id: "matrix", name: "Matrix Rain", color: "#22c55e", isAnimated: true },
  { id: "fireflies", name: "Fireflies", color: "#eab308", isAnimated: true },
  { id: "stars", name: "Twinkling Stars", color: "#fde047", isAnimated: true },
  { id: "bubbles", name: "Floating Bubbles", color: "#60a5fa", isAnimated: true },
  { id: "confetti", name: "Party Confetti", color: "#ec4899", isAnimated: true },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app-theme") as ThemeType) || "slate";
    }
    return "slate";
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
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
