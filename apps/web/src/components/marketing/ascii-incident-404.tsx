"use client";

import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { ArrowLeft, Home, Terminal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Particle = {
  // Target position in 404 shape
  tx: number;
  ty: number;
  // Current position
  x: number;
  y: number;
  // Velocities
  vx: number;
  vy: number;
  // Primary character ('#', '+', ':', etc.)
  char: string;
  // Display character during glitch/ember
  displayChar: string;
  // Visual properties
  size: number;
  colorIdx: number;
  // Individual noise phase
  noisePhase: number;
  noiseSpeed: number;
};

const GLITCH_GLYPHS = ["#", "+", ":", "=", ".", "*", "~", "x", "%", "!", "?", "/", "$", "&", "8"];

export function AsciiIncident404() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setShatterState] = useState<"intact" | "shattered" | "reconstructing">("intact");
  const shatterProgressRef = useRef(0);
  const isShatteredRef = useRef(false);

  // Mouse coordinate refs (avoid React re-renders on pointermove)
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  const triggerShatter = useCallback((clickX?: number, clickY?: number) => {
    if (isShatteredRef.current) return;
    isShatteredRef.current = true;
    shatterProgressRef.current = 0;
    setShatterState("shattered");

    const canvas = canvasRef.current;
    const targetX = clickX ?? (canvas ? canvas.clientWidth / 2 : 500);
    const targetY = clickY ?? (canvas ? canvas.clientHeight / 2 : 300);

    // Will be processed in animation loop
    (canvas as unknown as { __shatterCenter?: { x: number; y: number } }).__shatterCenter = {
      x: targetX,
      y: targetY,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let isVisible = true;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sample 404 typography onto a virtual canvas to extract exact particle coordinates
    const sample404Points = (rawW: number, rawH: number): Particle[] => {
      const w = Math.max(1, Math.floor(rawW));
      const h = Math.max(1, Math.floor(rawH));

      const isMobile = w < 640;
      const isTablet = w >= 640 && w < 1024;
      const step = isMobile ? 8 : isTablet ? 10 : 11;
      const particleFontSize = isMobile ? 9 : isTablet ? 11 : 13;

      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return [];

      // Sizing responsive to canvas so 404 is giant, bold, and fills the stage with cohesive spacing
      const fontSize = Math.floor(
        isMobile
          ? Math.min(w * 0.28, h * 0.52, 110)
          : isTablet
            ? Math.min(w * 0.28, h * 0.58, 200)
            : Math.min(w * 0.28, h * 0.62, 240)
      );

      const centerY = Math.floor(h / 2);
      const centerX = Math.floor(w / 2);

      // Reduced digit spacing so digits form a tight, cohesive "404" unit
      const digitSpacing = isMobile
        ? Math.floor(fontSize * 0.85)
        : isTablet
          ? Math.floor(fontSize * 0.86)
          : Math.floor(fontSize * 0.88);

      offCtx.fillStyle = "#FFFFFF";
      offCtx.font = `900 ${fontSize}px "Arial Black", Impact, "Segoe UI Black", "Trebuchet MS", sans-serif`;
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";

      offCtx.fillText("4", centerX - digitSpacing, centerY);
      offCtx.fillText("0", centerX, centerY);
      offCtx.fillText("4", centerX + digitSpacing, centerY);

      const imgData = offCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const sampled: Particle[] = [];

      const topBoundary = centerY - fontSize * 0.55;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3] ?? 0;
          if (alpha > 60) {
            // Vertical ASCII gradient matching classic incident terminal disassembly
            const normY = (y - topBoundary) / fontSize;
            let char = "#";

            if (normY < 0.28) {
              // Top region: structural wireframe glyphs (+, =, *, #, :)
              const topChars = ["+", "+", "=", "*", ":", "+", "#", "="];
              char = topChars[Math.floor(Math.random() * topChars.length)] ?? "+";
            } else if (normY < 0.68) {
              // Middle crossbar region: balanced structural ASCII (#, +, =, *, x, %)
              const midChars = ["#", "+", "+", "=", "*", "x", "%", ":", "#", "="];
              char = midChars[Math.floor(Math.random() * midChars.length)] ?? "#";
            } else {
              // Lower base region: dense incident blocks (#, B, %, 8, &, +)
              const botChars = ["#", "#", "B", "%", "8", "&", "+", "#", "x"];
              char = botChars[Math.floor(Math.random() * botChars.length)] ?? "#";
            }

            // Edge feathering: if alpha is low, assign edge glyphs
            if (alpha < 130) {
              const edgeChars = [":", "=", "*", "+", ":"];
              char = edgeChars[Math.floor(Math.random() * edgeChars.length)] ?? ":";
            }

            const randOffsetAngle = Math.random() * Math.PI * 2;
            const randDist = Math.random() * 4;

            // Color tier based on vertical gradient and subtle variation
            let colorIdx = Math.floor(Math.random() * 6);
            if (normY < 0.28) {
              colorIdx = Math.random() < 0.5 ? 0 : 1; // Brighter lilac / white-hot at the top
            }

            sampled.push({
              tx: x,
              ty: y,
              x: x + Math.cos(randOffsetAngle) * randDist,
              y: y + Math.sin(randOffsetAngle) * randDist,
              vx: (Math.random() - 0.5) * 0.3,
              vy: (Math.random() - 0.5) * 0.3,
              char,
              displayChar: char,
              size: particleFontSize,
              colorIdx,
              noisePhase: Math.random() * Math.PI * 2,
              noiseSpeed: 0.8 + Math.random() * 1.2,
            });
          }
        }
      }

      // Fail-safe fallback in case offscreen canvas text-rendering is unavailable
      if (sampled.length === 0) {
        const fallbackMatrix = [
          " #   #   #####   #   # ",
          " #   #  #     #  #   # ",
          " #   #  #     #  #   # ",
          " #####  #     #  ##### ",
          "     #  #     #      # ",
          "     #  #     #      # ",
          "     #   #####       # ",
        ];
        const rows = fallbackMatrix.length;
        const cols = fallbackMatrix[0]?.length ?? 23;
        const cellW = isMobile ? 12 : 24;
        const cellH = isMobile ? 16 : 28;
        const startX = centerX - Math.floor((cols * cellW) / 2);
        const startY = centerY - Math.floor((rows * cellH) / 2);

        for (let r = 0; r < rows; r++) {
          const line = fallbackMatrix[r] || "";
          for (let c = 0; c < cols; c++) {
            if (line[c] === "#") {
              const x = startX + c * cellW;
              const y = startY + r * cellH;
              sampled.push({
                tx: x,
                ty: y,
                x,
                y,
                vx: 0,
                vy: 0,
                char: "#",
                displayChar: "#",
                size: particleFontSize,
                colorIdx: Math.floor(Math.random() * 6),
                noisePhase: Math.random() * Math.PI * 2,
                noiseSpeed: 1,
              });
            }
          }
        }
      }

      return sampled;
    };

    const resize = () => {
      const target = containerRef.current || canvas;
      const rect = target.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      particles = sample404Points(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    // Pointer events for interaction
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? -9999 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? -9999 : e.clientY;
      mouseRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        active: true,
      };
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      triggerShatter(e.clientX - rect.left, e.clientY - rect.top);
    };

    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("mouseleave", handlePointerLeave);
    canvas.addEventListener("touchstart", handlePointerMove, { passive: true });
    canvas.addEventListener("touchmove", handlePointerMove, { passive: true });
    canvas.addEventListener("touchend", handlePointerLeave);
    canvas.addEventListener("click", handleCanvasClick);

    // Intersection observer to pause offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting : true;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isVisible || document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.06);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");

      // Color palettes (08_FRONTEND_DESIGN_SYSTEM.md §3)
      // Dark: white-hot core -> electric lavender -> vivid purple -> deep violet
      const darkPalette = ["#FFFFFF", "#FFE9FB", "#F0ABFC", "#D946EF", "#A855F7", "#C084FC", "#7C3AED"];
      // Light: ink-purple -> deep violet -> bold purple -> rich fuchsia -> vibrant violet
      const lightPalette = ["#1E1B4B", "#3B0764", "#4C1D95", "#581C87", "#6B21A8", "#7C3AED", "#9333EA"];
      const palette = isDark ? darkPalette : lightPalette;

      // Handle shatter explosion center if requested
      const shatterCenter = (canvas as unknown as { __shatterCenter?: { x: number; y: number } }).__shatterCenter;
      if (shatterCenter) {
        const cx = shatterCenter.x;
        const cy = shatterCenter.y;
        delete (canvas as unknown as { __shatterCenter?: { x: number; y: number } }).__shatterCenter;

        for (const p of particles) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.hypot(dx, dy) || 1;
          const force = (Math.random() * 12 + 6) * Math.min(1.5, 450 / dist);
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.7;

          p.vx += Math.cos(angle) * force;
          p.vy += Math.sin(angle) * force;
        }
      }

      // Update shatter lifecycle
      if (isShatteredRef.current && !prefersReducedMotion) {
        shatterProgressRef.current += dt * 0.42; // ~2.4s total animation

        if (shatterProgressRef.current > 0.42 && shatterProgressRef.current < 0.95) {
          setShatterState("reconstructing");
        }

        if (shatterProgressRef.current >= 1.0) {
          isShatteredRef.current = false;
          shatterProgressRef.current = 0;
          setShatterState("intact");
        }
      }

      const progress = shatterProgressRef.current;
      const mouse = mouseRef.current;
      const repelRadius = width < 640 ? 75 : 120;
      const particleFontSize = width < 640 ? 9 : width < 1024 ? 11 : 13;

      // Set monospaced font for all ASCII characters (no CSS variables to avoid browser fallback)
      ctx.font = `bold ${particleFontSize}px ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", Menlo, Consolas, "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        if (!prefersReducedMotion) {
          // Physics step
          if (isShatteredRef.current) {
            if (progress < 0.42) {
              // 1. Explosive outward drift
              p.vx *= 0.92;
              p.vy *= 0.92;
              // Mutate glyph during fracture
              if (Math.random() < 0.25) {
                p.displayChar = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)] ?? "!";
              }
            } else {
              // 2. Magnetic elastic pull back to 404 shape
              const pullStrength = Math.min(1, (progress - 0.42) * 2.2);
              const dx = p.tx - p.x;
              const dy = p.ty - p.y;
              p.vx += dx * (0.08 + pullStrength * 0.15);
              p.vy += dy * (0.08 + pullStrength * 0.15);
              p.vx *= 0.81;
              p.vy *= 0.81;

              // Revert to stable char
              if (pullStrength > 0.75) {
                p.displayChar = p.char;
              }
            }
          } else {
            // Intact state: elastic spring to target point + subtle organic breathing
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            p.vx += dx * 0.085;
            p.vy += dy * 0.085;
            p.vx *= 0.84;
            p.vy *= 0.84;

            // Subtle slow organic shimmer
            p.noisePhase += dt * p.noiseSpeed;
            p.vx += Math.sin(p.noisePhase) * 0.06;
            p.vy += Math.cos(p.noisePhase) * 0.06;

            // Cursor repulsion
            if (mouse.active) {
              const mdx = p.x - mouse.x;
              const mdy = p.y - mouse.y;
              const mdist = Math.hypot(mdx, mdy);
              if (mdist < repelRadius && mdist > 0.1) {
                const repelFactor = (1 - mdist / repelRadius) * 4.8;
                p.vx += (mdx / mdist) * repelFactor;
                p.vy += (mdy / mdist) * repelFactor;

                // Subtle momentary character glitch when near cursor
                if (Math.random() < 0.08) {
                  p.displayChar = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)] ?? p.char;
                } else {
                  p.displayChar = p.char;
                }
              } else {
                p.displayChar = p.char;
              }
            } else {
              p.displayChar = p.char;
            }
          }

          p.x += p.vx;
          p.y += p.vy;
        }

        // Color selection based on velocity/energy
        const speed = Math.hypot(p.vx, p.vy);
        let color = palette[p.colorIdx % palette.length] ?? palette[0];
        if (speed > 2.5) {
          color = isDark ? "#FFFFFF" : palette[0] ?? "#1E1B4B";
        } else if (speed > 1.2) {
          color = isDark ? "#F0ABFC" : palette[1] ?? "#2E1065";
        }

        ctx.fillStyle = color ?? (isDark ? "#A855F7" : "#4C1D95");
        ctx.fillText(p.displayChar, Math.round(p.x), Math.round(p.y));
      }

      // Draw subtle terminal hairline crosshairs near corners
      ctx.strokeStyle = isDark ? "rgba(168, 85, 247, 0.20)" : "rgba(109, 40, 217, 0.35)";
      ctx.lineWidth = 1;

      // Top-left crosshair
      ctx.beginPath();
      ctx.moveTo(24, 32);
      ctx.lineTo(44, 32);
      ctx.moveTo(32, 24);
      ctx.lineTo(32, 44);
      ctx.stroke();

      // Top-right crosshair
      ctx.beginPath();
      ctx.moveTo(width - 44, 32);
      ctx.lineTo(width - 24, 32);
      ctx.moveTo(width - 32, 24);
      ctx.lineTo(width - 32, 44);
      ctx.stroke();

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(0);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("mouseleave", handlePointerLeave);
      canvas.removeEventListener("touchstart", handlePointerMove);
      canvas.removeEventListener("touchmove", handlePointerMove);
      canvas.removeEventListener("touchend", handlePointerLeave);
      canvas.removeEventListener("click", handleCanvasClick);
      observer.disconnect();
    };
  }, [triggerShatter]);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white">
      {/* Subtle Atmospheric Cosmic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/Cosmicbg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-50 dark:opacity-20 blur-[1.5px] scale-105 select-none transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-[var(--bg)]/30 dark:to-[var(--bg)]/80" />
      </div>

      {/* Hairline Grid Texture Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top Console Navigation Bar */}
      <header className="relative z-30 w-full border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoMark className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="font-display font-bold text-lg tracking-tight lowercase text-[var(--fg)]">
              firebreak
            </span>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/app"
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--fg)] border border-[var(--line)] transition-colors shrink-0"
            >
              Console
            </Link>
          </div>
        </div>
      </header>

      {/* Ambient Telemetry Watermarks (Selectable text with animated chevrons) */}
      <div className="absolute top-20 left-4 sm:left-8 z-20 font-mono text-[11px] text-neutral-900 dark:text-[var(--fg-subtle)] space-y-1.5 hidden sm:block select-text">
        <div className="flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >GET /404</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >404. no route matched</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >checked the whole map. 0 results</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >the page moved, was never here</span>
        </div>
      </div>

      <div className="absolute top-20 right-4 sm:right-8 z-20 font-mono text-[11px] text-neutral-900 dark:text-[var(--fg-subtle)] space-y-1.5 text-right hidden sm:block select-text">
        <div className="flex items-center justify-end gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >ORBIT_STATUS: FRACTURED</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >VECTOR_COORDS: 0x404_VOID</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 hover:text-[var(--fg)] transition-colors group">
          <ChevronRightIcon size={12} className="text-[var(--accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span >DISPERSION: ACTIVE_ASCII_FIELD</span>
        </div>
      </div>

      {/* Screen Reader Accessibility Text */}
      <h1 className="sr-only">404 - Target Not Found. This route has left the incident boundary.</h1>

      {/* Interactive ASCII Canvas Stage - Limited to 404 area */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center my-auto px-4 py-2">
        <div
          ref={containerRef}
          className="relative w-full max-w-4xl h-[340px] sm:h-[400px] flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-crosshair touch-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Bottom Editorial Incident Lockup & Navigation */}
      <main className="relative z-20 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-6 text-center space-y-3 pointer-events-auto select-text">
        {/* Messaging */}
        <div className="space-y-1">
          <p className="text-sm sm:text-base text-neutral-950 dark:text-[var(--fg-muted)] font-mono font-medium max-w-md mx-auto leading-relaxed">
            Nothing at this address.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-mono text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--line)] text-neutral-900 dark:text-[var(--fg)] border border-[var(--line-strong)] active:scale-95 transition-all flex items-center gap-2 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/app"
            className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--accent-solid)]/15 flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Open Console</span>
          </Link>
        </div>
      </main>

      {/* Terminal Minimal Footer */}
      <footer className="relative z-20 w-full border-t border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-xs py-3 px-4 text-center font-mono text-[11px] text-neutral-800 dark:text-[var(--fg-subtle)] font-medium flex items-center justify-center gap-2 select-text">
        <Terminal className="w-3 h-3 text-[var(--accent)]" />
        <span>FIREBREAK INCIDENT ISOLATION SYSTEM · ALL OTHER ACTIVE DEPLOYMENTS HEALTHY</span>
      </footer>
    </div>
  );
}
