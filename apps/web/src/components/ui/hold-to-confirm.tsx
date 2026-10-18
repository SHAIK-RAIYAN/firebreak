"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ShieldAlert } from "lucide-react";

export function HoldToConfirm({
  onConfirm,
  label = "Hold to approve rollback",
  holdDurationMs = 800,
  disabled = false,
  className = "",
}: {
  onConfirm: () => void | Promise<void>;
  label?: string;
  holdDurationMs?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startHold = useCallback(() => {
    if (disabled || isConfirmed) return;
    setIsHolding(true);
    startTimeRef.current = performance.now();

    const step = (time: number) => {
      if (!startTimeRef.current) return;
      const elapsed = time - startTimeRef.current;
      const pct = Math.min(100, (elapsed / holdDurationMs) * 100);
      setProgress(pct);

      if (pct >= 100) {
        setIsHolding(false);
        setIsConfirmed(true);
        onConfirm();
      } else {
        requestRef.current = requestAnimationFrame(step);
      }
    };

    requestRef.current = requestAnimationFrame(step);
  }, [disabled, isConfirmed, holdDurationMs, onConfirm]);

  const endHold = useCallback(() => {
    if (isConfirmed) return;
    setIsHolding(false);
    startTimeRef.current = null;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    setProgress(0);
  }, [isConfirmed]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="space-y-1.5 w-full">
      <button
        type="button"
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (!isHolding) startHold();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            endHold();
          }
        }}
        disabled={disabled || isConfirmed}
        aria-describedby="hold-instructions"
        className={`relative overflow-hidden w-full h-11 rounded-lg border font-semibold text-sm select-none transition-all focus-visible:outline-2 focus-visible:outline-(--accent) disabled:opacity-50 disabled:cursor-not-allowed ${
          isConfirmed
            ? "bg-(--ok) border-(--ok) text-white"
            : "bg-(--accent-solid) border-(--accent-solid) text-white hover:brightness-110 active:scale-[0.99]"
        } ${className}`}
      >
        {/* Progress Fill Bar */}
        <div
          className="absolute inset-0 bg-white/25 pointer-events-none transition-all ease-linear"
          style={{ width: `${progress}%` }}
        />

        <div className="relative z-10 flex items-center justify-center gap-2">
          {isConfirmed ? (
            <>
              <Check className="w-4 h-4" strokeWidth={2} />
              <span>Confirmed</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" strokeWidth={2} />
              <span>
                {isHolding ? `Holding (${Math.round(progress)}%)` : label}
              </span>
            </>
          )}
        </div>
      </button>

      <div
        id="hold-instructions"
        className="text-[11px] font-mono text-(--fg-muted) text-center flex items-center justify-center gap-2"
      >
        <span>Press and hold 800ms to confirm</span>
        <span>&bull;</span>
        {/* Accessible instant fallback button */}
        <button
          type="button"
          onClick={() => {
            if (!disabled && !isConfirmed) {
              setIsConfirmed(true);
              onConfirm();
            }
          }}
          className="underline hover:text-(--accent) focus-visible:outline-none"
        >
          Instant click confirm
        </button>
      </div>
    </div>
  );
}
