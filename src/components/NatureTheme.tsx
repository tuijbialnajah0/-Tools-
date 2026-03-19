import React, { useEffect, useRef } from 'react';

export function NatureTheme() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const leaves: any[] = [];
    const leafCount = 50;

    for (let i = 0; i < leafCount; i++) {
      leaves.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        size: Math.random() * 15 + 5,
        speed: Math.random() * 2 + 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        drift: (Math.random() - 0.5) * 0.5,
        color: `hsl(${120 + Math.random() * 60}, ${40 + Math.random() * 30}%, ${20 + Math.random() * 20}%)`
      });
    }

    function drawLeaf(leaf: any) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rotation);
      ctx.fillStyle = leaf.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    let animationFrameId: number;

    function animate() {
      ctx!.fillStyle = '#064e3b'; // Dark forest green background
      ctx!.fillRect(0, 0, width, height);

      leaves.forEach(leaf => {
        leaf.y += leaf.speed;
        leaf.x += leaf.drift;
        leaf.rotation += leaf.rotationSpeed;

        if (leaf.y > height) {
          leaf.y = -leaf.size;
          leaf.x = Math.random() * width;
        }
        drawLeaf(leaf);
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
