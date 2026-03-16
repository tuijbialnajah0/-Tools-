import React, { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export function AnimatedBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme === "slate" || !["petals", "constellation", "water", "snow", "matrix"].includes(theme)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    // Initialize particles based on theme
    const init = () => {
      particles = [];
      const count = theme === "constellation" ? 100 : 50;
      
      for (let i = 0; i < count; i++) {
        if (theme === "petals") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 10 + 5,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 1 + 0.5,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 2 - 1,
            color: `rgba(253, ${164 + Math.random() * 50}, ${175 + Math.random() * 50}, 0.6)`
          });
        } else if (theme === "constellation") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speedX: Math.random() * 0.5 - 0.25,
            speedY: Math.random() * 0.5 - 0.25,
          });
        } else if (theme === "water") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 0,
            maxRadius: Math.random() * 50 + 20,
            opacity: 1,
            speed: Math.random() * 0.5 + 0.2
          });
        } else if (theme === "snow") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedY: Math.random() * 1 + 0.5,
            speedX: Math.random() * 0.5 - 0.25,
          });
        } else if (theme === "matrix") {
          particles.push({
            x: i * (canvas.width / count),
            y: Math.random() * canvas.height,
            speedY: Math.random() * 5 + 2,
            chars: "01".split("")
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (theme === "petals") {
        particles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;

          if (p.y > canvas.height) p.y = -p.size;
          if (p.x > canvas.width) p.x = -p.size;
          if (p.x < -p.size) p.x = canvas.width;
        });
      } else if (theme === "constellation") {
        ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
        ctx.strokeStyle = "rgba(99, 102, 241, 0.1)";
        particles.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }

          p.x += p.speedX;
          p.y += p.speedY;

          if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
          if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
      } else if (theme === "water") {
        ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
        particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();

          p.radius += p.speed;
          p.opacity -= 0.005;

          if (p.radius > p.maxRadius || p.opacity <= 0) {
            p.x = Math.random() * canvas.width;
            p.y = Math.random() * canvas.height;
            p.radius = 0;
            p.opacity = 1;
          }
        });
      } else if (theme === "snow") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y > canvas.height) p.y = -p.size;
          if (p.x > canvas.width) p.x = -p.size;
          if (p.x < -p.size) p.x = canvas.width;
        });
      } else if (theme === "matrix") {
        ctx.fillStyle = "rgba(34, 197, 94, 0.8)";
        ctx.font = "15px monospace";
        particles.forEach(p => {
          const char = p.chars[Math.floor(Math.random() * p.chars.length)];
          ctx.fillText(char, p.x, p.y);

          p.y += p.speedY;
          if (p.y > canvas.height) p.y = 0;
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    init();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  if (theme === "slate" || !["petals", "constellation", "water", "snow", "matrix"].includes(theme)) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40"
    />
  );
}
