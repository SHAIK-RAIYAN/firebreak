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
    <div className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3 font-mono text-xs overflow-hidden shadow-inner">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)] text-[var(--fg-subtle)] text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--ember)] animate-pulse" />
          <span>LIVE INCIDENT STREAM</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">REPLAY: INC-01</span>
      </div>
      <div className="space-y-1.5 min-h-[96px]">
        {TICKS.slice(0, activeCount).map((tick, idx) => {
          const colorClass =
            tick.tag === "danger"
              ? "text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20"
              : tick.tag === "warn"
              ? "text-[var(--warn)] bg-[var(--warn)]/10 border-[var(--warn)]/20"
              : tick.tag === "info"
              ? "text-[var(--info)] bg-[var(--info)]/10 border-[var(--info)]/20"
              : "text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/20";

          return (
            <div
              key={idx}
              className="flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-left-2"
            >
              <span className="text-[var(--fg-subtle)] font-mono shrink-0">{tick.time}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider border shrink-0 ${colorClass}`}
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
