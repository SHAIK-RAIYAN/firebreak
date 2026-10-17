"use client";

import { useState, useEffect } from "react";

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
    <div className="w-full bg-neutral-900/60 dark:bg-neutral-900/80 border border-neutral-700/40 dark:border-neutral-800 rounded-xl p-3 font-mono text-xs overflow-hidden backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-700/40 dark:border-neutral-800 text-neutral-400 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--ember)] animate-pulse" />
          <span className="font-semibold tracking-wider text-neutral-300">LIVE INCIDENT STREAM</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">REPLAY: INC-01</span>
      </div>
      <div className="space-y-1.5 min-h-[96px]">
        {TICKS.slice(0, activeCount).map((tick, idx) => {
          const colorClass =
            tick.tag === "danger"
              ? "text-red-400 bg-red-950/30 border-red-800/40"
              : tick.tag === "warn"
              ? "text-amber-400 bg-amber-950/30 border-amber-800/40"
              : tick.tag === "info"
              ? "text-sky-400 bg-sky-950/30 border-sky-800/40"
              : "text-emerald-400 bg-emerald-950/30 border-emerald-800/40";

          return (
            <div
              key={idx}
              className="flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-left-2"
            >
              <span className="text-neutral-500 font-mono shrink-0">{tick.time}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider border shrink-0 ${colorClass}`}
              >
                {tick.kind}
              </span>
              <span className="text-neutral-200 truncate">{tick.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
