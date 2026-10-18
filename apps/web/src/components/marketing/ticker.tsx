"use client";

import { useEffect, useState } from "react";

const TICKS = [
  { time: "02:14:07", kind: "ALERT", text: "checkout /api/health 500 (Invariant failed: pricing)", tag: "danger" },
  { time: "02:14:09", kind: "SUSPECT", text: "41ee4db refactor: support stacked discounts (+79)", tag: "warn" },
  { time: "02:14:41", kind: "APPROVED", text: "rollback approved by operator (ws_demo)", tag: "info" },
  { time: "02:15:12", kind: "VERIFIED", text: "3/3 healthy · 100% streak · recovered in 65s", tag: "ok" },
];

export function IncidentTicker() {
  const [activeCount, setActiveCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCount((prev) => (prev < TICKS.length ? prev + 1 : 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-[var(--surface)]/75 dark:bg-[var(--surface)]/60 border border-[var(--line)] rounded-xl p-3 font-mono text-xs overflow-hidden backdrop-blur-md shadow-xs">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)] text-[var(--fg-subtle)] text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--ember)] animate-pulse" />
          <span className="font-semibold tracking-wider text-[var(--fg)]">LIVE INCIDENT STREAM</span>
        </div>
      </div>
      {/* Fixed height container reserving exact space for all 4 rows to prevent hero layout shifts */}
      <div className="h-28 space-y-1.5 py-2 overflow-hidden">
        {TICKS.map((tick, idx) => {
          const isVisible = idx < activeCount;
          const colorClass =
            tick.tag === "danger"
              ? "text-[var(--danger)] bg-[var(--danger)]/15 border-[var(--danger)]/30"
              : tick.tag === "warn"
                ? "text-[var(--warn)] bg-[var(--warn)]/15 border-[var(--warn)]/30"
                : tick.tag === "info"
                  ? "text-[var(--accent)] bg-[var(--accent)]/15 border-[var(--accent)]/30"
                  : "text-[var(--ok)] bg-[var(--ok)]/15 border-[var(--ok)]/30";

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 h-5 transition-all duration-300 ${isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none"
                }`}
            >
              <span className="text-[var(--fg-subtle)] font-mono shrink-0">{tick.time}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider border shrink-0 ${colorClass}`}
              >
                {tick.kind}
              </span>
              <span className="text-[var(--fg)] truncate">{tick.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
