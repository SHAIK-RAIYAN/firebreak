"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { motion } from "motion/react";
import { AsciiFire } from "@/components/marketing/ascii-fire";
import { IncidentTicker } from "@/components/marketing/ticker";

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between pt-12 pb-16 overflow-hidden border-b border-[var(--line)]">
      {/* Hairline Grid Texture Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* ASCII Fire in background with subtle neutral warmth */}
      <div className="absolute inset-x-0 bottom-0 h-[48%] opacity-35 pointer-events-auto">
        <AsciiFire className="w-full h-full" intensity={0.55} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 space-y-8 my-auto">
        {/* Monospace Badge with smooth fade-in */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--line)] bg-[var(--surface)]/80 text-[11px] font-mono text-[var(--accent)] shadow-sm backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--ember)] animate-pulse" />
          <span>[ FOR TEAMS SHIPPING ON VERCEL + GITHUB ]</span>
        </motion.div>

        {/* Headlines */}
        <div className="space-y-3 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.05] text-[var(--fg)]"
          >
            Stop the spread.
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight leading-[1.05] text-[var(--fg-muted)]"
          >
            Roll back with proof.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="text-base sm:text-xl text-[var(--fg-muted)] max-w-2xl pt-2 leading-relaxed font-sans"
          >
            Firebreak finds the deploy that broke production, rolls it back when you approve, and proves it recovered with live health probes.
          </motion.p>
        </div>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="flex flex-wrap items-center gap-4 pt-2"
        >
          <Link
            href="/app"
            className="px-6 py-3 rounded-xl font-bold font-mono text-sm bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--accent-solid)]/20 flex items-center gap-2 group"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#loop"
            className="px-6 py-3 rounded-xl font-mono text-sm border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--bg-raised)] active:scale-95 transition-all flex items-center gap-2"
          >
            <span>See the loop ↓</span>
          </a>
        </motion.div>

        {/* Real-time Incident Ticker with motion reveal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="max-w-2xl pt-4"
        >
          <IncidentTicker />
        </motion.div>
      </div>
    </section>
  );
}
