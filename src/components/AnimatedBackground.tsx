import React, { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export function AnimatedBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const animatedThemes = [
      "petals", "sakura", "dandelions", "feathers", "hearts", 
      "lanterns", "clouds", "maple", "lotus", "magic", 
      "fireflies_forest", "bubbles_ocean", "sketch"
    ];
    const specialThemes = ["marin", "makima", "zero_two", "frieren"];
    
    if (theme === "slate" || (!animatedThemes.includes(theme) && !specialThemes.includes(theme))) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    
    // Load image for special themes
    if (specialThemes.includes(theme)) {
      const img = new Image();
      const urls: Record<string, string> = {
        marin: "https://i.pinimg.com/originals/21/2b/2d/212b2d3989c996614407890696969696.jpg",
        makima: "https://images.alphacoders.com/112/1126581.jpg",
        zero_two: "https://images.alphacoders.com/904/904832.jpg",
        frieren: "https://images.alphacoders.com/133/1331241.jpg"
      };
      img.src = urls[theme];
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageRef.current = img;
      };
    } else {
      imageRef.current = null;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    // Initialize particles based on theme
    const init = () => {
      particles = [];
      const isMobile = window.innerWidth < 768;
      let count = isMobile ? 25 : 50;
      
      if (theme === "sakura") count = isMobile ? 40 : 80;
      if (theme === "dandelions") count = isMobile ? 20 : 40;
      if (theme === "feathers") count = isMobile ? 15 : 30;
      if (theme === "hearts") count = isMobile ? 25 : 50;
      if (theme === "lanterns") count = isMobile ? 8 : 15;
      if (theme === "clouds") count = isMobile ? 5 : 10;
      if (theme === "maple") count = isMobile ? 30 : 60;
      if (theme === "lotus") count = isMobile ? 10 : 20;
      if (theme === "magic") count = isMobile ? 50 : 100;
      if (theme === "fireflies_forest") count = isMobile ? 30 : 60;
      if (theme === "bubbles_ocean") count = isMobile ? 20 : 40;
      if (theme === "sketch") count = isMobile ? 50 : 100;
      
      for (let i = 0; i < count; i++) {
        if (theme === "petals" || theme === "sakura") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 10 + 5,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 1 + 0.5,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 2 - 1,
            color: theme === "petals" 
              ? `rgba(253, ${164 + Math.random() * 50}, ${175 + Math.random() * 50}, 0.6)`
              : `rgba(249, ${168 + Math.random() * 50}, ${212 + Math.random() * 40}, 0.6)`
          });
        } else if (theme === "dandelions") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 5 + 2,
            speedX: Math.random() * 1 - 0.5,
            speedY: Math.random() * 0.5 + 0.2,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.02 + 0.01
          });
        } else if (theme === "feathers") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 10,
            speedX: Math.random() * 0.5 - 0.25,
            speedY: Math.random() * 0.3 + 0.1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 0.5 - 0.25
          });
        } else if (theme === "hearts") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 10 + 5,
            speedY: -(Math.random() * 1 + 0.5),
            speedX: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.5 + 0.3
          });
        } else if (theme === "lanterns") {
          particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * 100,
            size: Math.random() * 30 + 20,
            speedY: -(Math.random() * 0.5 + 0.2),
            speedX: Math.random() * 0.2 - 0.1,
            glow: Math.random() * 20 + 10
          });
        } else if (theme === "clouds") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5,
            size: Math.random() * 100 + 50,
            speedX: Math.random() * 0.2 + 0.1,
            opacity: Math.random() * 0.3 + 0.1
          });
        } else if (theme === "maple") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 15 + 10,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 1.5 + 0.5,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 2 - 1,
            color: `rgba(${249 + Math.random() * 6}, ${115 + Math.random() * 50}, 22, 0.6)`
          });
        } else if (theme === "lotus") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 40 + 20,
            speedX: Math.random() * 0.2 - 0.1,
            speedY: Math.random() * 0.2 - 0.1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 0.1 - 0.05
          });
        } else if (theme === "magic") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 1 - 0.5,
            speedY: Math.random() * 1 - 0.5,
            opacity: Math.random(),
            fadeSpeed: Math.random() * 0.02 + 0.01,
            color: `hsla(${Math.random() * 360}, 70%, 70%, `
          });
        } else if (theme === "fireflies_forest") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speedX: Math.random() * 0.8 - 0.4,
            speedY: Math.random() * 0.8 - 0.4,
            opacity: Math.random(),
            fadeSpeed: Math.random() * 0.02 + 0.01,
            color: `rgba(74, 222, 128, `
          });
        } else if (theme === "bubbles_ocean") {
          particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * 100,
            size: Math.random() * 10 + 2,
            speedY: -(Math.random() * 2 + 1),
            speedX: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.5 + 0.2
          });
        } else if (theme === "sketch") {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            x2: Math.random() * canvas.width,
            y2: Math.random() * canvas.height,
            speed: Math.random() * 2 + 1,
            opacity: Math.random() * 0.2 + 0.05
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw special theme background image
      if (specialThemes.includes(theme) && imageRef.current) {
        const img = imageRef.current;
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Add subtle scanlines or overlay for anime feel
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = theme === "marin" ? "#f472b6" : theme === "makima" ? "#991b1b" : theme === "zero_two" ? "#f43f5e" : "#818cf8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      if (theme === "petals" || theme === "sakura") {
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
      } else if (theme === "dandelions") {
        ctx.fillStyle = "rgba(254, 240, 138, 0.6)";
        particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.wobble) * 20, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speedY;
          p.x += p.speedX;
          p.wobble += p.wobbleSpeed;
          if (p.y > canvas.height) p.y = -p.size;
          if (p.x > canvas.width) p.x = -p.size;
          if (p.x < -p.size) p.x = canvas.width;
        });
      } else if (theme === "feathers") {
        ctx.fillStyle = "rgba(226, 232, 240, 0.4)";
        particles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;
          if (p.y > canvas.height) p.y = -p.size;
          if (p.x > canvas.width) p.x = -p.size;
          if (p.x < -p.size) p.x = canvas.width;
        });
      } else if (theme === "hearts") {
        particles.forEach(p => {
          ctx.fillStyle = `rgba(251, 113, 133, ${p.opacity})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.bezierCurveTo(p.x, p.y - 3, p.x - 5, p.y - 3, p.x - 5, p.y);
          ctx.bezierCurveTo(p.x - 5, p.y + 3, p.x, p.y + 5, p.x, p.y + 9);
          ctx.bezierCurveTo(p.x, p.y + 5, p.x + 5, p.y + 3, p.x + 5, p.y);
          ctx.bezierCurveTo(p.x + 5, p.y - 3, p.x, p.y - 3, p.x, p.y);
          ctx.fill();
          p.y += p.speedY;
          p.x += p.speedX;
          if (p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
          }
        });
      } else if (theme === "lanterns") {
        particles.forEach(p => {
          ctx.save();
          ctx.shadowBlur = p.glow;
          ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
          ctx.fillStyle = "rgba(251, 191, 36, 0.6)";
          ctx.fillRect(p.x, p.y, p.size * 0.8, p.size);
          ctx.restore();
          p.y += p.speedY;
          p.x += p.speedX;
          if (p.y < -p.size) {
            p.y = canvas.height + p.size;
            p.x = Math.random() * canvas.width;
          }
        });
      } else if (theme === "clouds") {
        particles.forEach(p => {
          ctx.fillStyle = `rgba(186, 230, 253, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.arc(p.x + p.size * 0.5, p.y - p.size * 0.2, p.size * 0.8, 0, Math.PI * 2);
          ctx.arc(p.x - p.size * 0.5, p.y - p.size * 0.2, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.speedX;
          if (p.x > canvas.width + p.size * 2) p.x = -p.size * 2;
        });
      } else if (theme === "maple") {
        particles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          // Simple maple leaf shape (star-like)
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos(i * Math.PI * 0.4) * p.size, Math.sin(i * Math.PI * 0.4) * p.size);
            ctx.lineTo(Math.cos(i * Math.PI * 0.4 + 0.2) * p.size * 0.5, Math.sin(i * Math.PI * 0.4 + 0.2) * p.size * 0.5);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;
          if (p.y > canvas.height) p.y = -p.size;
        });
      } else if (theme === "lotus") {
        particles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = "rgba(216, 180, 254, 0.4)";
          for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.ellipse(p.size / 2, 0, p.size / 2, p.size / 4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;
          if (p.x < -p.size) p.x = canvas.width + p.size;
          if (p.x > canvas.width + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = canvas.height + p.size;
          if (p.y > canvas.height + p.size) p.y = -p.size;
        });
      } else if (theme === "magic") {
        particles.forEach(p => {
          ctx.fillStyle = `${p.color}${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.speedX;
          p.y += p.speedY;
          p.opacity += p.fadeSpeed;
          if (p.opacity >= 1 || p.opacity <= 0) p.fadeSpeed *= -1;
        });
      } else if (theme === "fireflies_forest") {
        particles.forEach(p => {
          ctx.fillStyle = `${p.color}${p.opacity})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(74, 222, 128, 0.5)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          p.x += p.speedX;
          p.y += p.speedY;
          p.opacity += p.fadeSpeed;
          if (p.opacity >= 1 || p.opacity <= 0) p.fadeSpeed *= -1;
          if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
          if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
      } else if (theme === "bubbles_ocean") {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
        particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          p.y += p.speedY;
          p.x += p.speedX;
          if (p.y < -p.size) {
            p.y = canvas.height + p.size;
            p.x = Math.random() * canvas.width;
          }
        });
      } else if (theme === "sketch") {
        ctx.strokeStyle = "rgba(75, 85, 99, 0.1)";
        ctx.lineWidth = 1;
        particles.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x2, p.y2);
          ctx.stroke();
          // Subtle movement
          p.x += (Math.random() - 0.5) * p.speed;
          p.y += (Math.random() - 0.5) * p.speed;
          p.x2 += (Math.random() - 0.5) * p.speed;
          p.y2 += (Math.random() - 0.5) * p.speed;
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

  const animatedThemes = [
    "petals", "sakura", "dandelions", "feathers", "hearts", 
    "lanterns", "clouds", "maple", "lotus", "magic", 
    "fireflies_forest", "bubbles_ocean", "sketch"
  ];
  const specialThemes = ["marin", "makima", "zero_two", "frieren"];

  if (theme === "slate" || (!animatedThemes.includes(theme) && !specialThemes.includes(theme))) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40"
    />
  );
}
