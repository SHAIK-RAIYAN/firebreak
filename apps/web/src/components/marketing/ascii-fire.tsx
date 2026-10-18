"use client";

import { useEffect, useRef } from "react";

export function AsciiFire({
  className = "",
  intensity = 0.5,
  delay = 1,
}: {
  className?: string;
  intensity?: number;
  delay?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let delayTimeout: NodeJS.Timeout | null = null;
    let width = 0;
    let height = 0;
    const charWidth = 10;
    const charHeight = 14;
    let cols = 0;
    let rows = 0;
    let fireBuffer: number[] = [];
    let lastTime = 0;
    const FRAME_INTERVAL = 65; // ~15 FPS physics step for slow, languid ember motion

    const CHARS = " .:-=+*#%@";

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
      cols = Math.floor(width / charWidth);
      rows = Math.floor(height / charHeight);
      fireBuffer = new Array(cols * rows).fill(0);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mousePos.current = null;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const render = (time: number) => {
      if (time - lastTime >= FRAME_INTERVAL) {
        lastTime = time;

        // 1. Seed the bottom row with fire
        const bottomRowIndex = (rows - 1) * cols;
        for (let x = 0; x < cols; x++) {
          if (Math.random() < intensity) {
            fireBuffer[bottomRowIndex + x] = Math.floor(Math.random() * (CHARS.length - 1)) + 1;
          } else {
            const cur = fireBuffer[bottomRowIndex + x] ?? 0;
            fireBuffer[bottomRowIndex + x] = Math.max(0, cur - 1);
          }
        }

        // 2. Propagate flames upwards with slow decay and gentle wind
        for (let y = 0; y < rows - 1; y++) {
          for (let x = 0; x < cols; x++) {
            const fromIndex = (y + 1) * cols + x;
            const decay = Math.floor(Math.random() * 2);
            const wind = Math.floor(Math.random() * 3) - 1;
            const toX = Math.min(Math.max(x + wind, 0), cols - 1);
            const toIndex = y * cols + toX;

            const baseVal = fireBuffer[fromIndex] || 0;
            fireBuffer[toIndex] = Math.max(0, baseVal - decay);
          }
        }

        // 3. Clear the "firebreak" around mouse cursor (radius 3)
        if (mousePos.current) {
          const mouseCol = Math.floor(mousePos.current.x / charWidth);
          const mouseRow = Math.floor(mousePos.current.y / charHeight);
          const radius = 3;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx * dx + dy * dy <= radius * radius) {
                const cx = mouseCol + dx;
                const cy = mouseRow + dy;
                if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                  fireBuffer[cy * cols + cx] = 0;
                }
              }
            }
          }
        }

        // 4. Draw
        ctx.clearRect(0, 0, width, height);
        ctx.font = `${charHeight}px monospace`;
        ctx.textBaseline = "top";

        const isDark = document.documentElement.classList.contains("dark");

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const val = fireBuffer[y * cols + x] || 0;
            if (val === 0) continue;

            const char = CHARS[val] ?? CHARS.charAt(CHARS.length - 1) ?? " ";

            // Design-system fire palette (08_FRONTEND_DESIGN_SYSTEM.md §3)
            // Dark:  transparent → #1E0B3A → #6D28D9 → #A855F7 → #D946EF → #F0ABFC → #FFE9FB
            // Light: transparent → #8B5CF6 → #7C3AED → #A21CAF → #C026D3 → #4C1D95
            if (val > 7) {
              ctx.fillStyle = isDark ? "#FFE9FB" : "#4C1D95";
            } else if (val > 5) {
              ctx.fillStyle = isDark ? "#F0ABFC" : "#C026D3";
            } else if (val > 3) {
              ctx.fillStyle = isDark ? "#D946EF" : "#7C3AED";
            } else if (val > 1) {
              ctx.fillStyle = isDark ? "#A855F7" : "#8B5CF6";
            } else {
              ctx.fillStyle = isDark ? "#6D28D9" : "#A21CAF";
            }

            ctx.fillText(char, x * charWidth, y * charHeight);
          }
        }
      }

      animFrame = requestAnimationFrame(render);
    };

    const startAnimation = () => {
      animFrame = requestAnimationFrame(render);
    };

    if (delay > 0) {
      delayTimeout = setTimeout(startAnimation, delay * 1000);
    } else {
      startAnimation();
    }

    return () => {
      if (delayTimeout) clearTimeout(delayTimeout);
      if (animFrame) cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [intensity, delay]);

  return (
    <canvas
      ref={canvasRef}
      className={`block pointer-events-auto select-none ${className}`}
      aria-hidden="true"
    />
  );
}
