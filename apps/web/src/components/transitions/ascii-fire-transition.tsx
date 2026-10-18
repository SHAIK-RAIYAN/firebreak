"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";

type AsciiFireTransitionContextType = {
  triggerTransition: (targetUrl: string) => void;
  triggerEntranceReveal: () => void;
  isTransitioning: boolean;
};

const AsciiFireTransitionContext =
  createContext<AsciiFireTransitionContextType | null>(null);

export function useAsciiFireTransition() {
  const ctx = useContext(AsciiFireTransitionContext);
  if (!ctx) {
    throw new Error(
      "useAsciiFireTransition must be used within AsciiFireTransitionProvider"
    );
  }
  return ctx;
}

const CHARS = " .:-=+*#%@";

export function AsciiFireTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const [isActive, setIsActive] = useState(false);

  const isTransitioningRef = useRef(false);
  const isEntranceRevealRef = useRef(false);
  const targetUrlRef = useRef<string | null>(null);
  const fromPathnameRef = useRef<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startRevealCallbackRef = useRef<(() => void) | null>(null);

  // Trigger signature ASCII fire transition to a target URL (e.g. /app or /login)
  const triggerTransition = useCallback(
    (targetUrl: string) => {
      // Prevent rapid repeated clicks or duplicate transitions
      if (isTransitioningRef.current) return;

      // Check reduced motion preference for accessibility
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        router.push(targetUrl);
        return;
      }

      isTransitioningRef.current = true;
      targetUrlRef.current = targetUrl;
      fromPathnameRef.current = pathnameRef.current;

      // Prefetch destination immediately so it loads behind the flames
      try {
        router.prefetch(targetUrl);
      } catch {
        // Ignore prefetch errors in development
      }

      setIsActive(true);
    },
    [router]
  );

  // Trigger signature ASCII fire entrance reveal (e.g. on direct cold-load of /login)
  const triggerEntranceReveal = useCallback(() => {
    if (isTransitioningRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    isTransitioningRef.current = true;
    isEntranceRevealRef.current = true;
    targetUrlRef.current = null;
    fromPathnameRef.current = "";
    setIsActive(true);
  }, []);

  // Intercept links navigating between marketing pages, console, and login (/app <-> / <-> /login)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Don't intercept if already transitioning
      if (isTransitioningRef.current) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const cleanHref = (href.split("?")[0] || "").split("#")[0] || "";
      const isCurrentInApp = pathnameRef.current.startsWith("/app");
      const isCurrentInLogin = pathnameRef.current.startsWith("/login");

      const isNavigatingToLogin = cleanHref === "/login";
      const isNavigatingToApp = cleanHref === "/app" || cleanHref.startsWith("/app/");
      const isNavigatingToHome = cleanHref === "/" || cleanHref === "";

      // Case 1: Entering console from marketing/login
      const isEnteringApp = !isCurrentInApp && isNavigatingToApp;

      // Case 2: Entering login page from marketing/console
      const isEnteringLogin = !isCurrentInLogin && isNavigatingToLogin;

      // Case 3: Returning to home from inside console or from login page (clicking Logo in app-shell/login-view)
      const isReturningHome = (isCurrentInApp || isCurrentInLogin) && isNavigatingToHome;

      // Case 4: Navigating from login to console
      const isLoginToApp = isCurrentInLogin && isNavigatingToApp;

      if (isEnteringApp || isEnteringLogin || isReturningHome || isLoginToApp) {
        // Ignore auxiliary clicks (new tab, middle click, modified keys)
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button !== 0 ||
          anchor.target === "_blank"
        ) {
          return;
        }

        e.preventDefault();
        triggerTransition(href);
      }
    };

    // Use capture to intercept before Next.js Link internal click handler
    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, {
        capture: true,
      });
    };
  }, [triggerTransition]);

  // Cancel transition cleanly on browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (isTransitioningRef.current) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        isTransitioningRef.current = false;
        targetUrlRef.current = null;
        setIsActive(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // When pathname changes after router.push, trigger the upward reveal sequence
  useEffect(() => {
    if (
      isTransitioningRef.current &&
      fromPathnameRef.current &&
      pathname !== fromPathnameRef.current
    ) {
      if (startRevealCallbackRef.current) {
        startRevealCallbackRef.current();
      }
    }
  }, [pathname]);

  // Autonomous Canvas fire simulation engine
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = width < 640;
    const charWidth = isMobile ? 10 : 13;
    const charHeight = isMobile ? 14 : 17;
    

    let cols = Math.ceil(width / charWidth);
    let rows = Math.ceil(height / charHeight);
    let fireBuffer = new Uint8Array(cols * rows);

    const IGNITE_DURATION = 180; // ms: flames ignite at bottom edge
    const ENGULF_DURATION = 620; // ms: flames surge upward and engulf entire viewport
    const REVEAL_DURATION = 580; // ms: flames retreat upward off the top edge

    const isEntrance = isEntranceRevealRef.current;
    if (isEntrance) {
      isEntranceRevealRef.current = false;
    }

    type SimPhase = "igniting" | "engulfing" | "covered" | "revealing";
    let simPhase: SimPhase = isEntrance ? "revealing" : "igniting";

    const igniteStartTime = performance.now();
    let engulfStartTime = 0;
    let revealStartTime = isEntrance ? performance.now() : 0;
    let coveredWaitTimeout: NodeJS.Timeout | null = null;

    if (isEntrance) {
      fireBuffer.fill(9);
    }

    const triggerReveal = () => {
      if (simPhase === "covered") {
        simPhase = "revealing";
        revealStartTime = performance.now();
      }
    };
    startRevealCallbackRef.current = triggerReveal;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      cols = Math.ceil(width / charWidth);
      rows = Math.ceil(height / charHeight);
      fireBuffer = new Uint8Array(cols * rows);
    };
    window.addEventListener("resize", handleResize);

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");
      const backingColor = isDark ? "#0A0A0A" : "#FAFAFA";

      ctx.font = `bold ${charHeight}px ui-monospace, "SF Mono", "Cascadia Code", monospace`;
      ctx.textBaseline = "top";

      // ─────────────────────────────────────────────────────────────
      // Phase 1: Ignite (ASCII flames ignite at bottom edge)
      // ─────────────────────────────────────────────────────────────
      if (simPhase === "igniting") {
        const elapsed = time - igniteStartTime;
        const progress = Math.min(1, elapsed / IGNITE_DURATION);

        // Seed bottom 2 rows with intense flame seeds
        for (let y = rows - 2; y < rows; y++) {
          const rowIdx = y * cols;
          for (let x = 0; x < cols; x++) {
            fireBuffer[rowIdx + x] = Math.random() < 0.8 ? 9 : 5;
          }
        }

        // Upward propagation into bottom rows
        for (let y = rows - 6; y < rows - 1; y++) {
          const fromRow = (y + 1) * cols;
          const toRow = y * cols;
          for (let x = 0; x < cols; x++) {
            const decay = Math.floor(Math.random() * 2);
            const wind = Math.floor(Math.random() * 3) - 1;
            const toX = Math.min(Math.max(x + wind, 0), cols - 1);
            fireBuffer[toRow + toX] = Math.max(
              0,
              (fireBuffer[fromRow + x] || 0) - decay
            );
          }
        }

        if (progress >= 1) {
          simPhase = "engulfing";
          engulfStartTime = performance.now();
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Phase 2: Engulf (Flames grow upward into dense flowing field)
      // ─────────────────────────────────────────────────────────────
      else if (simPhase === "engulfing") {
        const elapsed = time - engulfStartTime;
        const progress = Math.min(1, elapsed / ENGULF_DURATION);
        // Exponential ease-in upward sweep
        const ease = Math.pow(progress, 1.28);
        const baseBurnLine = Math.floor(rows * (1 - ease * 1.2));

        // Seed heat along and below organic turbulent wave front
        for (let x = 0; x < cols; x++) {
          const wave1 = Math.sin(x * 0.16 + time * 0.007) * 3;
          const wave2 = Math.cos(x * 0.32 - time * 0.01) * 2;
          const burnY = Math.floor(baseBurnLine + wave1 + wave2);

          for (let y = Math.max(0, burnY); y < rows; y++) {
            const idx = y * cols + x;
            if (y > burnY + 3) {
              fireBuffer[idx] = 9;
            } else {
              fireBuffer[idx] = Math.random() < 0.88 ? 9 : 7;
            }
          }
        }

        // Propagate flames upward with turbulence & wind
        for (let y = 0; y < rows - 1; y++) {
          const fromRow = (y + 1) * cols;
          const toRow = y * cols;
          for (let x = 0; x < cols; x++) {
            const decay = Math.floor(Math.random() * 2);
            const wind = Math.floor(Math.random() * 3) - 1;
            const toX = Math.min(Math.max(x + wind, 0), cols - 1);
            fireBuffer[toRow + toX] = Math.max(
              0,
              (fireBuffer[fromRow + x] || 0) - decay
            );
          }
        }

        if (progress >= 1) {
          // Viewport completely engulfed!
          simPhase = "covered";
          fireBuffer.fill(9);

          // Phase 3: Navigate using Next.js App Router while screen is 100% covered
          if (targetUrlRef.current) {
            router.push(targetUrlRef.current);
          }

          // Safety fallback: if route change is delayed, reveal after 650ms
          coveredWaitTimeout = setTimeout(() => {
            triggerReveal();
          }, 650);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Phase 3: Covered (Solid boiling fire veil while destination mounts)
      // ─────────────────────────────────────────────────────────────
      else if (simPhase === "covered") {
        for (let y = 0; y < rows; y++) {
          const rowIdx = y * cols;
          for (let x = 0; x < cols; x++) {
            fireBuffer[rowIdx + x] = Math.random() < 0.95 ? 9 : 8;
          }
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Phase 4: Reveal (Flames retreat upward off top, revealing console from bottom)
      // ─────────────────────────────────────────────────────────────
      else if (simPhase === "revealing") {
        const elapsed = time - revealStartTime;
        const progress = Math.min(1, elapsed / REVEAL_DURATION);
        // Ease-out upward clear front
        const ease = Math.pow(progress, 0.9);
        const retreatBase = Math.floor(rows * (1 - ease * 1.25));

        // Rows below the retreat line are cleared (revealing console from bottom up)
        for (let x = 0; x < cols; x++) {
          const wave1 = Math.sin(x * 0.18 + time * 0.008) * 3;
          const wave2 = Math.cos(x * 0.35 - time * 0.012) * 2;
          const retreatY = Math.floor(retreatBase + wave1 + wave2);

          // Everything below retreat front is transparent
          for (let y = Math.max(0, retreatY); y < rows; y++) {
            fireBuffer[y * cols + x] = 0;
          }

          // Seed bottom flame pack just at the retreat line so flames remain dense above it
          if (retreatY >= 0 && retreatY < rows) {
            fireBuffer[retreatY * cols + x] = Math.random() < 0.9 ? 9 : 7;
          }
        }

        // Propagate the flame pack upward toward the top of the viewport
        const maxSimRow = Math.min(rows - 1, Math.max(1, retreatBase + 2));
        for (let y = 0; y < maxSimRow; y++) {
          const fromRow = (y + 1) * cols;
          const toRow = y * cols;
          for (let x = 0; x < cols; x++) {
            const decay = Math.floor(Math.random() * 2);
            const wind = Math.floor(Math.random() * 3) - 1;
            const toX = Math.min(Math.max(x + wind, 0), cols - 1);
            fireBuffer[toRow + toX] = Math.max(
              0,
              (fireBuffer[fromRow + x] || 0) - decay
            );
          }
        }

        // ───────────────────────────────────────────────────────────
        // Phase 5: Finish (Clean unmount, console fully interactive)
        // ───────────────────────────────────────────────────────────
        if (progress >= 1) {
          if (coveredWaitTimeout) clearTimeout(coveredWaitTimeout);
          isTransitioningRef.current = false;
          targetUrlRef.current = null;
          setIsActive(false);
          return;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Render ASCII Fire Cells with Solid Backing Rects
      // ─────────────────────────────────────────────────────────────
      for (let y = 0; y < rows; y++) {
        const rowIdx = y * cols;
        for (let x = 0; x < cols; x++) {
          const val = fireBuffer[rowIdx + x] || 0;
          if (val === 0) continue;

          const px = x * charWidth;
          const py = y * charHeight;

          // For deep heat, draw opaque backing rect so page behind is 100% blocked
          if (val >= 5) {
            ctx.fillStyle = backingColor;
            ctx.fillRect(px, py, charWidth, charHeight);
          }

          // Firebreak theme-aware palette (08_FRONTEND_DESIGN_SYSTEM.md §3)
          // Dark: #6D28D9 → #A855F7 → #D946EF → #F0ABFC → #FFE9FB
          // Light: #A21CAF → #8B5CF6 → #7C3AED → #C026D3 → #4C1D95
          let color: string;
          if (isDark) {
            if (val > 7) color = "#FFE9FB";
            else if (val > 5) color = "#F0ABFC";
            else if (val > 3) color = "#D946EF";
            else if (val > 1) color = "#A855F7";
            else color = "#6D28D9";
          } else {
            if (val > 7) color = "#4C1D95";
            else if (val > 5) color = "#C026D3";
            else if (val > 3) color = "#7C3AED";
            else if (val > 1) color = "#8B5CF6";
            else color = "#A21CAF";
          }

          const char = CHARS[val] ?? "@";
          ctx.fillStyle = color;
          ctx.fillText(char, px, py);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (coveredWaitTimeout) clearTimeout(coveredWaitTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive, router]);

  return (
    <AsciiFireTransitionContext.Provider
      value={{
        triggerTransition,
        triggerEntranceReveal,
        isTransitioning: isActive,
      }}
    >
      {children}

      {/* Cinematic Full-Viewport ASCII Fire Transition Overlay */}
      {isActive && (
        <div
          className="fixed inset-0 z-99999 pointer-events-auto select-none overflow-hidden"
          aria-hidden="true"
        >
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      )}
    </AsciiFireTransitionContext.Provider>
  );
}
