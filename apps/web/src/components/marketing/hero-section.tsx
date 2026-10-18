"use client";

import { AsciiFire } from "@/components/marketing/ascii-fire";
import { IncidentTicker } from "@/components/marketing/ticker";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] lg:h-[calc(100svh-4rem)] flex flex-col justify-between py-6 lg:py-8 overflow-hidden border-b border-[var(--line)]">
      {/* Hairline Grid Texture Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* ASCII Fire in background with theme-aware contrast */}
      <div className="absolute inset-x-0 bottom-0 h-[46%] opacity-70 dark:opacity-35 pointer-events-auto select-none">
        <AsciiFire className="w-full h-full" intensity={0.7} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 space-y-6 my-auto">
        {/* Monospace Badge with smooth fade-in */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full  text-[11px] font-mono text-accent shadow-xs backdrop-blur-sm"
        >
          <span>[ FOR TEAMS SHIPPING ON VERCEL + GITHUB ]</span>
        </motion.div>

        {/* Headlines */}
        <div className="space-y-2 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.04] text-[var(--fg)]"
          >
            Stop the spread.
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight leading-[1.04] text-[var(--fg-muted)]"
          >
            Roll back with proof.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
            className="text-base sm:text-lg text-[var(--fg-muted)] max-w-2xl pt-2 leading-relaxed font-sans"
          >
            Firebreak finds the deploy that broke production, stages a preflight-checked rollback, and proves recovery with automated health probes.
          </motion.p>
        </div>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32, ease: "easeOut" }}
          className="flex flex-wrap items-center gap-3.5 pt-1"
        >
          <Link
            href="/app"
            className="px-5 py-2.5 rounded-xl font-bold font-mono text-sm bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--accent-solid)]/15 flex items-center gap-2 group"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#loop"
            className="px-5 py-2.5 rounded-xl font-mono text-sm border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--line)] active:scale-95 transition-all flex items-center gap-2"
          >
            <span>See the loop ↓</span>
          </a>
        </motion.div>

        {/* Real-time Incident Ticker with motion reveal */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4, ease: "easeOut" }}
          className="max-w-2xl pt-2"
        >
          <IncidentTicker />
        </motion.div>
      </div>
    </section>
  );
}
