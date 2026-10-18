"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAsciiFireTransition } from "@/components/transitions/ascii-fire-transition";

interface WelcomeScreenProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  nextUrl?: string;
}

/**
 * Continuous cursive handwritten SVG path for "Welcome".
 * Coordinates: 640x160 viewBox, flowing cursive strokes from W to e.
 */
const CURSIVE_WELCOME_PATH =
  "M 55 42 C 45 28, 30 38, 35 62 C 40 92, 62 122, 76 122 C 92 122, 106 82, 116 52 C 124 90, 138 122, 154 122 C 170 122, 182 86, 192 54 C 196 40, 208 44, 206 60 C 204 80, 184 86, 192 72 C 198 58, 214 58, 218 72 C 224 88, 235 96, 246 96 C 258 96, 272 18, 284 18 C 294 18, 282 80, 276 106 C 274 118, 286 122, 296 114 C 308 104, 320 88, 330 76 C 336 68, 348 70, 342 80 C 335 90, 322 92, 325 108 C 328 118, 340 120, 352 112 C 362 104, 372 88, 380 76 C 388 62, 408 62, 408 82 C 408 106, 386 114, 376 102 C 368 92, 375 72, 390 66 C 405 60, 415 66, 428 70 C 434 76, 430 115, 435 115 C 440 115, 448 78, 458 72 C 468 66, 465 115, 472 115 C 478 115, 488 78, 498 72 C 508 66, 505 112, 515 112 C 522 112, 530 96, 538 80 C 542 66, 528 60, 520 70 C 512 80, 518 108, 534 108 C 550 108, 576 92, 602 80";

export function WelcomeScreen({ user, nextUrl = "/app" }: WelcomeScreenProps) {
  const { triggerTransition } = useAsciiFireTransition();
  const shouldReduceMotion = useReducedMotion();
  const hasTriggeredRef = useRef(false);

  // Fallback to name, email username, or "Operator"
  const displayName =
    user.name?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Operator";

  // Clean URL query params immediately so refreshing doesn't replay
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  // Sequence: handwritten cursive animation -> name reveal -> trigger ASCII fire
  useEffect(() => {
    if (hasTriggeredRef.current) return;

    const delayMs = shouldReduceMotion ? 600 : 2300;
    const timer = setTimeout(() => {
      hasTriggeredRef.current = true;
      triggerTransition(nextUrl);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [triggerTransition, nextUrl, shouldReduceMotion]);

  return (
    <div
      className="w-full space-y-6 text-center select-none"
      role="status"
      aria-live="polite"
    >
      {/* Subtle Brand Tag */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex items-center justify-center gap-2"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-(--ember)" />
        <span className="text-[11px] font-mono tracking-widest text-(--fg-subtle) uppercase">
          Authentication Verified
        </span>
      </motion.div>

      {/* Elegant Handwritten Cursive "Welcome" SVG */}
      <div className="w-full max-w-[340px] sm:max-w-[380px] mx-auto px-2">
        <svg
          viewBox="0 0 640 150"
          className="w-full h-auto overflow-visible text-(--accent)"
          aria-label="Welcome"
        >
          <defs>
            <filter id="handwritten-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#A855F7" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Delicate Background Tracer Line */}
          <path
            d={CURSIVE_WELCOME_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Drawing Ink Stroke */}
          <motion.path
            d={CURSIVE_WELCOME_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#handwritten-glow)"
            initial={
              shouldReduceMotion
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 1.45,
              ease: [0.65, 0, 0.35, 1],
            }}
          />
        </svg>
      </div>

      {/* User Name Reveal */}
      <motion.div
        initial={
          shouldReduceMotion
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 10, filter: "blur(6px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{
          duration: 0.6,
          delay: shouldReduceMotion ? 0.1 : 1.05,
          ease: "easeOut",
        }}
        className="space-y-1.5 pt-1 px-2"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--fg) break-words line-clamp-2">
          {displayName}
        </h1>
      </motion.div>

      {/* Quiet console launch indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.45,
          delay: shouldReduceMotion ? 0.2 : 1.45,
        }}
        className="pt-2"
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono text-(--fg-muted)">
          <span className="w-1.5 h-1.5 rounded-full bg-(--ok) animate-pulse" />
          <span>Entering console</span>
        </div>
      </motion.div>
    </div>
  );
}
