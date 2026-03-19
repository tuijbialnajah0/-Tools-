import React, { useEffect, useRef } from 'react';

export function CinematicNatureTheme() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // --- State ---
    let time = 0;
    let wind = 1;
    let targetWind = 1;
    let lightningFlash = 0;
    let isLongPressing = false;
    let touchX = width / 2;
    let touchY = height / 2;
    let tiltX = 0;
    let tiltY = 0;

    // --- Entities ---
    const leaves: any[] = [];
    const rain: any[] = [];
    const fireflies: any[] = [];
    const ripples: any[] = [];

    // Init Leaves
    for (let i = 0; i < 30; i++) {
      leaves.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 3 + 1, // 1 (far) to 3 (near)
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 1 + 0.5,
        speedX: Math.random() * 0.5 - 0.25,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        color: `hsl(${120 + Math.random() * 40}, ${40 + Math.random() * 40}%, ${20 + Math.random() * 30}%)`
      });
    }

    // Init Rain
    for (let i = 0; i < 60; i++) {
      rain.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 2 + 1,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 10 + 10
      });
    }

    // Init Fireflies
    for (let i = 0; i < 20; i++) {
      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.8,
        z: Math.random() * 2 + 1,
        size: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: Math.random() * 0.5 + 0.3
      });
    }

    // --- Drawing Functions ---

    function drawMountains() {
      // Far mountains
      ctx!.fillStyle = '#020617'; // Very dark blue/black
      ctx!.beginPath();
      ctx!.moveTo(0, height);
      for (let i = 0; i <= width + 100; i += 100) {
        const y = height * 0.6 + Math.sin(i * 0.005 + time * 0.1) * 30 + Math.cos(i * 0.01) * 50 + tiltY * 10;
        ctx!.lineTo(i - tiltX * 10, y);
      }
      ctx!.lineTo(width, height);
      ctx!.fill();

      // Mid forest
      ctx!.fillStyle = '#064e3b'; // Dark green
      ctx!.beginPath();
      ctx!.moveTo(0, height);
      for (let i = 0; i <= width + 60; i += 60) {
        const y = height * 0.7 + Math.sin(i * 0.01 + time * 0.2) * 20 + Math.cos(i * 0.02) * 40 + tiltY * 20;
        ctx!.lineTo(i - tiltX * 20, y);
      }
      ctx!.lineTo(width, height);
      ctx!.fill();
    }

    function drawWater() {
      const waterY = height * 0.85;
      
      // Water base
      ctx!.fillStyle = 'rgba(2, 15, 25, 0.9)';
      ctx!.fillRect(0, waterY, width, height - waterY);

      // Draw reflections (simplified)
      ctx!.save();
      ctx!.globalAlpha = 0.3;
      fireflies.forEach(f => {
        if (f.y > waterY - 150) {
          const reflectY = waterY + (waterY - f.y);
          if (reflectY < height) {
            const renderX = f.x - tiltX * 50 * f.z;
            ctx!.beginPath();
            ctx!.arc(renderX + Math.sin(time * 2 + f.y) * 5, reflectY, f.size * 2, 0, Math.PI * 2);
            ctx!.fillStyle = '#fef08a';
            ctx!.fill();
          }
        }
      });
      ctx!.restore();

      // Draw Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.01;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx!.beginPath();
        ctx!.ellipse(r.x, r.y, r.radius, r.radius * 0.3, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.5})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }
    }

    function updateAndDrawLeaves() {
      leaves.forEach(leaf => {
        leaf.y += leaf.speedY * leaf.z;
        leaf.x += (leaf.speedX + wind * 0.5) * leaf.z;
        leaf.rotation += leaf.rotSpeed;

        if (leaf.y > height) {
          leaf.y = -20;
          leaf.x = Math.random() * width;
        }
        if (leaf.x > width + 20) leaf.x = -20;
        if (leaf.x < -20) leaf.x = width + 20;

        ctx!.save();
        ctx!.translate(leaf.x - tiltX * 30 * leaf.z, leaf.y + tiltY * 30 * leaf.z);
        ctx!.rotate(leaf.rotation);
        
        ctx!.fillStyle = leaf.color;
        // Simulate blur with opacity
        ctx!.globalAlpha = leaf.z < 1.5 ? 0.4 : leaf.z < 2.5 ? 0.7 : 1.0;
        ctx!.beginPath();
        ctx!.ellipse(0, 0, leaf.size * leaf.z, (leaf.size / 2) * leaf.z, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      });
    }

    function updateAndDrawRain() {
      ctx!.strokeStyle = 'rgba(200, 220, 255, 0.2)';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      rain.forEach(drop => {
        drop.y += drop.speed * drop.z;
        drop.x += wind * drop.speed * 0.2 * drop.z;

        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * width;
          
          // Create tiny ripple if it hits water
          if (Math.random() > 0.8) {
             ripples.push({
               x: drop.x,
               y: height * 0.85 + Math.random() * (height * 0.15),
               radius: 1,
               speed: 0.5,
               alpha: 0.3
             });
          }
        }
        if (drop.x > width) drop.x = 0;
        if (drop.x < 0) drop.x = width;

        const renderX = drop.x - tiltX * 40 * drop.z;
        const renderY = drop.y + tiltY * 40 * drop.z;

        ctx!.moveTo(renderX, renderY);
        ctx!.lineTo(renderX - wind * drop.length * 0.2, renderY - drop.length);
      });
      ctx!.stroke();
    }

    function updateAndDrawFireflies() {
      fireflies.forEach(f => {
        if (isLongPressing) {
          const dx = touchX - f.x;
          const dy = touchY - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            f.vx += (dx / dist) * 0.05;
            f.vy += (dy / dist) * 0.05;
          }
        } else {
          f.vx += (Math.random() - 0.5) * 0.1;
          f.vy += (Math.random() - 0.5) * 0.1;
        }

        // Friction and speed limit
        f.vx *= 0.95;
        f.vy *= 0.95;
        
        f.x += f.vx;
        f.y += f.vy + Math.sin(time * 2 + f.phase) * 0.5;

        // Wrap around
        if (f.x < 0) f.x = width;
        if (f.x > width) f.x = 0;
        if (f.y < 0) f.y = height;
        if (f.y > height) f.y = 0;

        f.phase += 0.05;
        const alpha = f.baseAlpha + Math.sin(f.phase) * 0.3;

        const renderX = f.x - tiltX * 50 * f.z;
        const renderY = f.y + tiltY * 50 * f.z;

        // Draw glow
        ctx!.beginPath();
        ctx!.arc(renderX, renderY, f.size * f.z * 4, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(253, 224, 71, ${alpha * 0.2})`;
        ctx!.fill();

        // Draw core
        ctx!.beginPath();
        ctx!.arc(renderX, renderY, f.size * f.z, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(253, 224, 71, ${alpha})`;
        ctx!.fill();
      });
    }

    // --- Main Loop ---
    let animationFrameId: number;
    let cachedSkyGradient: CanvasGradient | null = null;
    let cachedWidth = 0;
    let cachedHeight = 0;

    function render() {
      time += 0.01;
      
      // Wind logic
      wind += (targetWind - wind) * 0.01;
      if (Math.random() < 0.005) {
        targetWind = (Math.random() - 0.5) * 4; // Gust
      } else if (Math.random() < 0.01) {
        targetWind = Math.random() > 0.5 ? 1 : -1; // Normal drift
      }

      // Lightning logic
      if (Math.random() < 0.001) {
        lightningFlash = 1;
      }

      // Clear / Sky
      if (lightningFlash > 0) {
        const skyGradient = ctx!.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, `rgba(200, 220, 255, ${lightningFlash})`);
        skyGradient.addColorStop(1, `rgba(100, 120, 150, ${lightningFlash})`);
        ctx!.fillStyle = skyGradient;
        lightningFlash -= 0.05;
      } else {
        if (!cachedSkyGradient || cachedWidth !== width || cachedHeight !== height) {
          cachedSkyGradient = ctx!.createLinearGradient(0, 0, 0, height);
          cachedSkyGradient.addColorStop(0, '#020617'); // Very dark blue
          cachedSkyGradient.addColorStop(1, '#064e3b'); // Dark green
          cachedWidth = width;
          cachedHeight = height;
        }
        ctx!.fillStyle = cachedSkyGradient;
      }
      ctx!.fillRect(0, 0, width, height);

      drawMountains();
      updateAndDrawLeaves();
      updateAndDrawRain();
      updateAndDrawFireflies();
      drawWater();

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    // --- Event Listeners ---
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    let pressTimer: any;

    const handlePointerDown = (e: PointerEvent) => {
      touchX = e.clientX;
      touchY = e.clientY;
      
      // Ripple
      if (touchY > height * 0.7) {
        ripples.push({
          x: touchX,
          y: touchY,
          radius: 10,
          speed: 2,
          alpha: 1
        });
      }

      // Leaves scatter
      leaves.forEach(leaf => {
        const dx = leaf.x - touchX;
        const dy = leaf.y - touchY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          leaf.speedX += (dx / dist) * 5;
          leaf.speedY += (dy / dist) * 5;
        }
      });

      pressTimer = setTimeout(() => {
        isLongPressing = true;
      }, 300);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isLongPressing) {
        touchX = e.clientX;
        touchY = e.clientY;
      }
    };

    const handlePointerUp = () => {
      clearTimeout(pressTimer);
      isLongPressing = false;
    };

    let lastTouchX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchX = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const diff = currentX - lastTouchX;
      if (Math.abs(diff) > 10) {
        targetWind = diff > 0 ? 3 : -3;
      }
      lastTouchX = currentX;
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // gamma is left-to-right tilt in degrees, where right is positive
        // beta is front-to-back tilt in degrees, where front is positive
        tiltX = Math.max(-30, Math.min(30, e.gamma)) / 30; // -1 to 1
        tiltY = Math.max(-30, Math.min(30, e.beta - 45)) / 30; // -1 to 1
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: '#020617' }}
    />
  );
}
