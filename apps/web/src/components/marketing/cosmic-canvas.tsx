"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  baseOpacity: number;
  pulsePhase: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

export function CosmicCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let isVisible = true;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Particles array
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 28;

    // Embers from trajectory collision
    const sparks: Spark[] = [];

    // Packet state
    let packetT = 0;
    let orbitAngle = 0;
    let lastTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Re-init particles on resize if empty
      if (particles.length === 0) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const baseOp = 0.15 + Math.random() * 0.45;
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 0.8 + Math.random() * 1.6,
            speedX: (Math.random() - 0.5) * 0.12,
            speedY: (Math.random() - 0.5) * 0.12,
            opacity: baseOp,
            baseOpacity: baseOp,
            pulsePhase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Pause when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting : true;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    // Spawn sparks at the firebreak barrier
    const spawnBarrierSparks = (x: number, y: number, isDark: boolean) => {
      const colors = isDark
        ? ["#C026D3", "#A855F7", "#F0ABFC", "#E9D5FF"]
        : ["#7C3AED", "#6D28D9", "#A21CAF", "#C026D3"];
      const count = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.4; // scatter backwards from the barrier
        const speed = 0.6 + Math.random() * 1.4;
        sparks.push({
          x,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 35 + Math.random() * 25,
          color: colors[Math.floor(Math.random() * colors.length)] ?? "#A855F7",
        });
      }
    };

    const render = (time: number) => {
      if (!isVisible || document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");

      // Barrier curve coordinates (anchored at roughly 63% horizontal, matching artwork)
      const barrierX = width * 0.64;
      const barrierTopY = height * 0.05;
      const barrierMidY = height * 0.5;
      const barrierBottomY = height * 0.95;
      const barrierCurveOffset = width * 0.025;

      // 1. Draw subtle ambient particles
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.speedX;
          p.y += p.speedY;
          p.pulsePhase += delta * 1.5;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        const currentOpacity =
          p.baseOpacity * (0.7 + 0.3 * Math.sin(p.pulsePhase));
        ctx.fillStyle = isDark
          ? `rgba(216, 180, 254, ${currentOpacity * 0.6})`
          : `rgba(124, 58, 237, ${currentOpacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Dynamic Trajectory Curve from origin node to barrier
      const originX = width * 0.08;
      const originY = height * 0.62;
      const controlX = width * 0.32;
      const controlY = height * 0.68;
      const targetX = barrierX;
      const targetY = height * 0.44;

      // Advance signal packet
      if (!prefersReducedMotion) {
        packetT += delta * 0.42; // ~2.4s loop duration
        if (packetT >= 1.0) {
          spawnBarrierSparks(targetX, targetY, isDark);
          packetT = 0;
        }
      } else {
        packetT = 0.75; // static position for reduced motion
      }

      // Compute current packet position along quadratic bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
      const t = packetT;
      const invT = 1 - t;
      const currentX =
        invT * invT * originX + 2 * invT * t * controlX + t * t * targetX;
      const currentY =
        invT * invT * originY + 2 * invT * t * controlY + t * t * targetY;

      // 3. Draw faint glowing pulse behind packet
      const packetGlowRadius = 8 + 4 * Math.sin(time * 0.005);
      const gradient = ctx.createRadialGradient(
        currentX,
        currentY,
        0,
        currentX,
        currentY,
        packetGlowRadius,
      );
      if (isDark) {
        gradient.addColorStop(0, "rgba(240, 171, 252, 0.8)");
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.4)");
        gradient.addColorStop(1, "rgba(124, 58, 237, 0)");
      } else {
        gradient.addColorStop(0, "rgba(124, 58, 237, 0.7)");
        gradient.addColorStop(0.5, "rgba(162, 28, 175, 0.3)");
        gradient.addColorStop(1, "rgba(124, 58, 237, 0)");
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(currentX, currentY, packetGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Signal packet core dot
      ctx.fillStyle = isDark ? "#FFFFFF" : "#7C3AED";
      ctx.beginPath();
      ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Subtle origin radar pulse
      const radarPhase = (time * 0.001) % 2.5;
      if (radarPhase < 1.8 && !prefersReducedMotion) {
        const radarR = radarPhase * 22;
        const radarAlpha = (1 - radarPhase / 1.8) * 0.4;
        ctx.strokeStyle = isDark
          ? `rgba(192, 38, 211, ${radarAlpha})`
          : `rgba(124, 58, 237, ${radarAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(originX, originY, radarR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 5. Firebreak collision sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        if (!s) continue;
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94; // friction
        s.vy *= 0.94;

        const sparkAlpha = Math.max(0, 1 - s.life / s.maxLife);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = sparkAlpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
        }
      }

      // 6. Draw dynamic firebreak barrier pulse arc
      const barrierPulse = Math.sin(time * 0.003) * 0.2 + 0.8;
      ctx.strokeStyle = isDark
        ? `rgba(192, 38, 211, ${0.35 * barrierPulse})`
        : `rgba(124, 58, 237, ${0.4 * barrierPulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barrierX + barrierCurveOffset, barrierTopY);
      ctx.quadraticCurveTo(
        barrierX - barrierCurveOffset,
        barrierMidY,
        barrierX + barrierCurveOffset,
        barrierBottomY,
      );
      ctx.stroke();

      // 7. Slow rotating orbital dashed ring
      if (!prefersReducedMotion) {
        orbitAngle += delta * 0.035;
      }
      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.rotate(orbitAngle);
      ctx.strokeStyle = isDark
        ? "rgba(168, 85, 247, 0.12)"
        : "rgba(124, 58, 237, 0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 10]);
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.38, height * 0.24, -0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

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
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
