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
 * Coordinates: 490x120 viewBox, elegant calligraphic script with authentic cursive anatomy.
 */
const CURSIVE_WELCOME_PATH =
  "M 28 34 C 22 42, 24 54, 34 54 C 44 54, 48 36, 52 24 C 54 18, 60 18, 62 26 C 65 38, 65 68, 67 95 C 68 101, 76 101, 80 94 C 88 80, 94 48, 98 32 C 101 22, 107 24, 108 34 C 111 48, 112 76, 115 95 C 117 101, 125 101, 129 93 C 135 80, 137 54, 142 48 C 145 44, 147 48, 146 56 C 145 68, 142 86, 148 95 C 151 98, 156 97, 160 91 C 166 82, 170 66, 173 58 C 176 50, 184 52, 183 62 C 182 72, 173 78, 167 82 C 162 86, 164 96, 172 96 C 178 96, 184 90, 188 80 C 195 64, 204 32, 210 20 C 214 12, 220 14, 218 24 C 215 38, 209 74, 208 95 C 208 101, 215 101, 220 94 C 225 86, 229 76, 233 68 C 238 58, 246 56, 249 58 C 251 60, 246 66, 240 70 C 234 76, 232 88, 238 94 C 243 98, 250 97, 256 88 C 261 80, 265 70, 269 62 C 274 54, 282 56, 282 64 C 282 74, 271 80, 268 88 C 267 94, 272 97, 279 97 C 286 97, 292 88, 294 76 C 295 64, 290 58, 282 58 C 288 58, 296 62, 303 62 C 306 72, 310 86, 312 95 C 314 84, 318 62, 326 58 C 331 56, 336 76, 338 95 C 340 84, 344 62, 352 58 C 358 56, 362 76, 364 95 C 365 101, 372 101, 377 92 C 382 82, 386 68, 389 62 C 393 52, 401 54, 400 64 C 399 74, 389 80, 383 84 C 378 88, 380 96, 388 96 C 396 96, 412 90, 428 82 C 438 76, 450 70, 460 68";

export function WelcomeScreen({ user, nextUrl = "/app" }: WelcomeScreenProps) {
  const { triggerTransition } = useAsciiFireTransition();
  const shouldReduceMotion = useReducedMotion();
  const hasTriggeredRef = useRef(false);

  // Fallback to name, email username, or "Operator"
  const displayName =
    user.name?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Operator";

  // Sequence: handwritten cursive animation -> name reveal -> trigger ASCII fire
  useEffect(() => {
    if (hasTriggeredRef.current) return;

    const delayMs = shouldReduceMotion ? 600 : 2300;
    const timer = setTimeout(() => {
      hasTriggeredRef.current = true;
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
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
          viewBox="0 0 490 125"
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
