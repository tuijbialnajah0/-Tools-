import React, { useEffect, useRef } from 'react';

export function ItachiTheme() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;

    const crows: Crow[] = [];
    const crowCount = 15;
    const smokeParticles: SmokeParticle[] = [];
    const smokeCount = 50;

    class SmokeParticle {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      vx: number = 0;
      vy: number = 0;
      life: number = 0;
      maxLife: number = 0;
      color: string = '';

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + 50;
        this.size = Math.random() * 100 + 50;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = -Math.random() * 2 - 1;
        this.maxLife = Math.random() * 200 + 100;
        this.life = this.maxLife;
        const r = Math.floor(Math.random() * 50 + 150);
        this.color = `rgba(${r}, 0, 0, `;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.life <= 0 || this.size <= 0) {
          this.reset();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = (this.life / this.maxLife) * 0.15;
        ctx.fillStyle = this.color + opacity + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Crow {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      speedX: number = 0;
      speedY: number = 0;
      wingPhase: number = 0;
      wingSpeed: number = 0;

      constructor() {
        this.reset();
        this.x = Math.random() * width;
      }

      reset() {
        this.size = Math.random() * 15 + 10;
        this.x = -50;
        this.y = Math.random() * height;
        this.speedX = Math.random() * 3 + 2;
        this.speedY = (Math.random() - 0.5) * 1;
        this.wingPhase = Math.random() * Math.PI * 2;
        this.wingSpeed = Math.random() * 0.15 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.wingPhase += this.wingSpeed;

        if (this.x > width + 50) {
          this.reset();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Body
        ctx.fillStyle = '#050505';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.6, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        const wingSpan = Math.sin(this.wingPhase) * this.size;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.2, 0);
        ctx.quadraticCurveTo(0, -wingSpan, this.size * 0.8, 0);
        ctx.quadraticCurveTo(0, wingSpan * 0.2, -this.size * 0.2, 0);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(this.size * 0.5, -this.size * 0.1, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const init = () => {
      resize();
      for (let i = 0; i < crowCount; i++) {
        crows.push(new Crow());
      }
      for (let i = 0; i < smokeCount; i++) {
        smokeParticles.push(new SmokeParticle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Background base
      ctx.fillStyle = 'rgba(10, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Smoke/Flame Effect
      smokeParticles.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      // Crows
      crows.forEach(crow => {
        crow.update();
        crow.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* Background Canvas for Smoke and Crows */}
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-60"
      />
      
      {/* Itachi's Mangekyou Sharingan - Center Large */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-[80vh] h-[80vh] animate-spin-very-slow text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]">
           {/* Outer Ring */}
           <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
           {/* Red Iris */}
           <circle cx="50" cy="50" r="45" fill="rgba(153, 27, 27, 0.3)" />
           
           {/* Itachi's Mangekyou Pattern (Three curved blades) */}
           <g transform="translate(50, 50)" fill="black">
             <path d="M0 -8 C15 -8 35 -30 35 -45 C35 -30 15 -15 0 -8 Z" transform="rotate(0)" />
             <path d="M0 -8 C15 -8 35 -30 35 -45 C35 -30 15 -15 0 -8 Z" transform="rotate(120)" />
             <path d="M0 -8 C15 -8 35 -30 35 -45 C35 -30 15 -15 0 -8 Z" transform="rotate(240)" />
             
             {/* Connecting curves */}
             <circle cx="0" cy="0" r="8" />
             
             {/* Blade extensions */}
             <path d="M0 -8 Q20 -10 35 -45 Q10 -20 0 -8" transform="rotate(0)" />
             <path d="M0 -8 Q20 -10 35 -45 Q10 -20 0 -8" transform="rotate(120)" />
             <path d="M0 -8 Q20 -10 35 -45 Q10 -20 0 -8" transform="rotate(240)" />
           </g>
        </svg>
      </div>

      {/* Floating Sharingan Eyes */}
      <div className="absolute top-20 left-[15%] w-40 h-40 opacity-10 pointer-events-none">
        <SharinganSVG className="animate-spin-slow" />
      </div>
      <div className="absolute bottom-20 right-[15%] w-56 h-56 opacity-10 pointer-events-none">
        <SharinganSVG className="animate-spin-slow-reverse" />
      </div>

      <style>
        {`
          @keyframes spin-very-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes spin-slow-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-very-slow {
            animation: spin-very-slow 60s linear infinite;
          }
          .animate-spin-slow {
            animation: spin-slow 30s linear infinite;
          }
          .animate-spin-slow-reverse {
            animation: spin-slow-reverse 35s linear reverse infinite;
          }
        `}
      </style>
    </div>
  );
}

function SharinganSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} w-full h-full text-red-700`}>
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="45" fill="rgba(153, 27, 27, 0.2)" />
      <g transform="translate(50, 50)" fill="black">
        <circle cx="0" cy="0" r="7" />
        <path d="M0 -7 C10 -7 25 -25 25 -35 C25 -25 10 -12 0 -7 Z" transform="rotate(0)" />
        <path d="M0 -7 C10 -7 25 -25 25 -35 C25 -25 10 -12 0 -7 Z" transform="rotate(120)" />
        <path d="M0 -7 C10 -7 25 -25 25 -35 C25 -25 10 -12 0 -7 Z" transform="rotate(240)" />
      </g>
    </svg>
  );
}
