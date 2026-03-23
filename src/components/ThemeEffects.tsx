import React, { useEffect, useState, useMemo } from 'react';
import { CinematicNatureTheme } from './CinematicNatureTheme';
import { EidTheme } from './EidTheme';

export function ThemeEffects() {
  const [theme, setTheme] = useState<string | null>(localStorage.getItem('app-theme'));

  useEffect(() => {
    const applyThemeClass = (currentTheme: string | null) => {
      // Remove any existing theme classes
      const classesToRemove: string[] = [];
      document.documentElement.classList.forEach(cls => {
        if (cls.startsWith('theme-')) {
          classesToRemove.push(cls);
        }
      });
      classesToRemove.forEach(cls => document.documentElement.classList.remove(cls));
      
      // Add the new theme class if it exists
      if (currentTheme === 'pink-petals') {
        document.documentElement.classList.add('theme-petals');
      } else if (currentTheme === 'cinematic-nature') {
        document.documentElement.classList.add('theme-cinematic-nature');
      } else if (currentTheme === 'eid-ul-fitr') {
        document.documentElement.classList.add('theme-eid');
      }
    };

    const handleThemeChange = () => {
      const newTheme = localStorage.getItem('app-theme');
      setTheme(newTheme);
      applyThemeClass(newTheme);
    };

    // Apply on initial load
    applyThemeClass(localStorage.getItem('app-theme'));

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // Generate static petals with random CSS variables for animation
  const petals = useMemo(() => {
    if (theme !== 'pink-petals') return null;
    
    return Array.from({ length: 40 }).map((_, i) => {
      const startX = Math.random() * 100;
      const endX = startX + (Math.random() * 20 - 10);
      const duration = Math.random() * 5 + 5; // 5-10s
      const delay = Math.random() * -10; // Start at different times
      const size = Math.random() * 10 + 8; // 8-18px
      const endRotation = Math.random() * 720 - 360;

      return (
        <div
          key={i}
          className="absolute pointer-events-none z-0"
          style={{
            left: `${startX}vw`,
            top: `-10vh`,
            width: `${size}px`,
            height: `${size * 1.2}px`,
            background: 'linear-gradient(135deg, #ffb7c5 0%, #ff8da1 100%)',
            borderRadius: '150% 0 150% 0',
            opacity: Math.random() * 0.5 + 0.3,
            animation: `fall-${i} ${duration}s linear ${delay}s infinite`,
            boxShadow: '0 0 4px rgba(255, 183, 197, 0.4)'
          }}
        >
          <style>
            {`
              @keyframes fall-${i} {
                0% {
                  transform: translate(0, 0) rotate(0deg);
                }
                100% {
                  transform: translate(${endX - startX}vw, 120vh) rotate(${endRotation}deg);
                }
              }
            `}
          </style>
        </div>
      );
    });
  }, [theme]);

  if (theme === 'cinematic-nature') {
    return <CinematicNatureTheme />;
  }

  if (theme === 'eid-ul-fitr') {
    return <EidTheme />;
  }

  if (theme !== 'pink-petals') return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
      {petals}
    </div>
  );
}
