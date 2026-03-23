import React, { useMemo, useEffect, useState } from 'react';
import { Moon, Star } from 'lucide-react';

export function EidTheme() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 2 + 0.5;
      const delay = Math.random() * 5;
      const duration = 3 + Math.random() * 4;
      const opacity = 0.2 + Math.random() * 0.5;
      const layer = Math.floor(Math.random() * 3); // 0: back, 1: mid, 2: front

      return (
        <div
          key={i}
          className="absolute rounded-full bg-amber-100/60"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${size}px`,
            height: `${size}px`,
            opacity: opacity,
            animation: `twinkle ${duration}s ease-in-out ${delay}s infinite alternate`,
            zIndex: layer
          }}
        />
      );
    });
  }, []);

  const lanterns = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const x = (i * 8.5) + 2;
      const delay = i * 0.4;
      const height = 10 + Math.random() * 20;
      const scale = 0.8 + Math.random() * 0.4;
      
      return (
        <div
          key={i}
          className="absolute top-0 pointer-events-none"
          style={{
            left: `${x}%`,
            animation: `sway ${5 + Math.random() * 3}s ease-in-out ${delay}s infinite alternate`,
            transformOrigin: 'top center',
            zIndex: 10
          }}
        >
          {/* Hanging string */}
          <div className="w-[1px] bg-gradient-to-b from-amber-900/60 to-amber-700/40 mx-auto" style={{ height: `${height}vh` }} />
          
          {/* Lantern body */}
          <div 
            className="w-10 h-16 bg-gradient-to-b from-amber-500/40 to-amber-900/60 rounded-xl border border-amber-400/30 relative flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.3)]"
            style={{ transform: `scale(${scale})` }}
          >
            {/* Inner glow */}
            <div className="w-5 h-10 bg-amber-200/30 rounded-lg blur-sm animate-pulse" />
            
            {/* Decorative patterns */}
            <div className="absolute inset-2 border border-amber-400/10 rounded-lg flex flex-col justify-around items-center">
              <div className="w-full h-[1px] bg-amber-400/20" />
              <div className="w-full h-[1px] bg-amber-400/20" />
              <div className="w-full h-[1px] bg-amber-400/20" />
            </div>
            
            {/* Top and bottom caps */}
            <div className="absolute -top-2 left-1 right-1 h-3 bg-amber-800/60 rounded-t-full border-t border-amber-400/40" />
            <div className="absolute -bottom-2 left-1 right-1 h-3 bg-amber-800/60 rounded-b-full border-b border-amber-400/40" />
            
            {/* Tassel */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[2px] h-6 bg-amber-600/40 rounded-full" />
          </div>
        </div>
      );
    });
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-slate-950">
      <style>
        {`
          @keyframes sway {
            from { transform: rotate(-4deg); }
            to { transform: rotate(4deg); }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 0.8; transform: scale(1.2); }
          }
          @keyframes moon-glow {
            0%, 100% { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.3)); }
            50% { filter: drop-shadow(0 0 40px rgba(251, 191, 36, 0.6)); }
          }
          @keyframes float-slow {
            0%, 100% { transform: translateY(0) translateX(0); }
            33% { transform: translateY(-15px) translateX(10px); }
            66% { transform: translateY(10px) translateX(-5px); }
          }
          @keyframes star-fall {
            0% { transform: translate(0, 0) rotate(45deg) scale(0); opacity: 0; }
            10% { opacity: 1; scale: 1; }
            100% { transform: translate(-500px, 500px) rotate(45deg) scale(0); opacity: 0; }
          }
        `}
      </style>
      
      {/* Deep Night Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-indigo-950 opacity-80" />
      
      {/* Atmospheric Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[120px] rounded-full" />

      {/* Stars background */}
      <div className="absolute inset-0">
        {stars}
      </div>
      
      {/* Shooting Stars */}
      <div className="absolute top-0 right-0 w-full h-full">
        <div className="absolute top-[10%] right-[20%] w-[2px] h-[100px] bg-gradient-to-b from-white to-transparent" style={{ animation: 'star-fall 10s linear infinite', animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[10%] w-[2px] h-[80px] bg-gradient-to-b from-white to-transparent" style={{ animation: 'star-fall 12s linear infinite', animationDelay: '7s' }} />
      </div>
      
      {/* Hanging Lanterns */}
      <div className="absolute inset-0">
        {lanterns}
      </div>

      {/* Large Crescent Moon with detailed glow */}
      <div 
        className="absolute top-24 right-24 text-amber-200/80"
        style={{ 
          animation: 'float-slow 15s ease-in-out infinite, moon-glow 5s ease-in-out infinite',
          zIndex: 5
        }}
      >
        <div className="relative">
          <Moon className="w-32 h-32 fill-amber-200/20 stroke-[1.5px]" />
          {/* Outer halo */}
          <div className="absolute inset-0 bg-amber-400/10 blur-3xl rounded-full -z-10" />
        </div>
      </div>

      {/* Foreground decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-slate-950 to-transparent z-20" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 z-30">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-200/20 rounded-full blur-[1px]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float-slow ${10 + Math.random() * 10}s linear ${Math.random() * -20}s infinite`,
              opacity: Math.random() * 0.5
            }}
          />
        ))}
      </div>
    </div>
  );
}
