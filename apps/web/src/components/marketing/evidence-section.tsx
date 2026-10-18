"use client";

import { AlertCircle, Check, Sparkles } from "lucide-react";
import { motion, type Variants } from "motion/react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export function EvidenceSection() {
  return (
    <section id="evidence" className="py-16 lg:py-20 border-t border-[var(--line)] bg-[var(--bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs text-[var(--accent)] tracking-wider">
            <span>[03]</span>
            <span>EVIDENCE, NOT GUESSES</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display tracking-tight text-[var(--fg)]">
              Every suspect has receipts.
            </h2>
            <p className="text-[var(--fg-muted)] text-sm sm:text-base max-w-xl">
              Deterministic static analysis scores suspect commits before AI ever sees them.
            </p>
          </div>
        </div>

        {/* 3 Coordinated Content Blocks */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="space-y-6"
        >
          {/* Top Row: Block 1 (Diff Evidence) & Block 2 (Deterministic Scoring) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Block 1: Diff Evidence */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-7 bg-[var(--surface)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm font-mono text-xs flex flex-col"
            >
              {/* Header */}
              <div className="bg-[var(--bg-raised)] px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)] animate-pulse" />
                  <span className="font-semibold text-[var(--fg)]">lib/pricing.ts</span>
                  <span className="text-[10px] text-[var(--fg-subtle)]">(applyDiscount)</span>
                </div>
                <span className="text-[10px] text-[var(--fg-subtle)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--line)]">
                  commit: 41ee4db
                </span>
              </div>

              {/* Error banner */}
              <div className="px-4 py-2 bg-[var(--danger)]/10 border-b border-[var(--danger)]/20 text-[var(--danger)] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  TypeError: Cannot read properties of undefined (reading &apos;reduce&apos;)
                </span>
              </div>

              {/* Diff lines */}
              <div className="p-4 space-y-1 overflow-x-auto text-[11px] leading-relaxed flex-1">
                <div className="text-[var(--fg-subtle)]">@@ -32,7 +32,9 @@ export function applyDiscount(totalCents, discount) &#123;</div>
                <div className="text-[var(--fg-muted)]">   if (!discount) return totalCents;</div>
                <div className="bg-[var(--danger)]/15 text-[var(--danger)] -mx-4 px-4 py-0.5 font-medium">
                  -  const pct = Math.min(Math.max(discount.percent, 0), 100);
                </div>
                <div className="bg-[var(--ok)]/15 text-[var(--ok)] -mx-4 px-4 py-0.5">
                  +  // Refactor: support stacked discount rules
                </div>
                <div className="bg-[var(--ok)]/20 text-[var(--ok)] -mx-4 px-4 py-0.5 font-semibold">
                  +  const totalPct = discount.stacked.reduce((acc, d) =&gt; acc + d.percent, 0);
                </div>
                <div className="text-[var(--fg-muted)]">   return Math.round(totalCents * (1 - totalPct / 100));</div>
                <div className="text-[var(--fg-muted)]"> &#125;</div>
              </div>
            </motion.div>

            {/* Block 2: Score Breakdown */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-5 bg-[var(--bg-raised)] border border-[var(--line)] rounded-2xl p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-3.5">
                  <span className="font-mono text-xs text-[var(--fg-subtle)] uppercase tracking-wider font-semibold">
                    DETERMINISTIC SCORE
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-lg font-bold text-[var(--danger)]">+79</span>
                    <span className="text-xs text-[var(--fg-subtle)]">/ 100 PTS</span>
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                    <span className="text-[var(--fg)]">file: lib/pricing.ts</span>
                    <span className="font-bold text-[var(--accent)]">+40 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                    <span className="text-[var(--fg)]">symbol: applyDiscount</span>
                    <span className="font-bold text-[var(--accent)]">+25 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                    <span className="text-[var(--fg)]">token: &apos;reduce&apos;</span>
                    <span className="font-bold text-[var(--accent)]">+10 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                    <span className="text-[var(--fg)]">recency: newest deployment</span>
                    <span className="font-bold text-[var(--accent)]">+4 pts</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--line)] mt-3 text-[11px] text-[var(--fg-subtle)] font-mono">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>Deterministic: Identical stack traces produce identical scores.</span>
              </div>
            </motion.div>
          </div>

          {/* Block 3: AI Explanation & Suggested Fix */}
          <motion.div
            variants={itemVariants}
            className="border border-[var(--line)] rounded-2xl bg-[var(--surface)] p-5 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Summary */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3" />
                    <span>ADVISORY · CLAUDE 3.5 SONNET</span>
                  </span>
                  <span className="text-xs font-semibold text-[var(--fg)] truncate">
                    Root Cause Analysis &amp; Suggested Fix
                  </span>
                </div>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                  Commit <span className="font-mono text-[var(--fg)]">41ee4db</span> assumed <code className="text-[var(--accent)]">discount.stacked</code> is always an array. When a single discount arrives, calling <code className="text-[var(--danger)]">.reduce()</code> throws a TypeError.
                </p>
              </div>

              {/* Right: Quick Patch Snippet */}
              <div className="lg:w-1/2 shrink-0">
                <div className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-xl font-mono text-[11px] text-[var(--ok)] overflow-x-auto leading-relaxed">
                  <span className="text-[var(--fg-subtle)] block text-[10px] mb-1 font-sans">Suggested Patch:</span>
                  {`const totalPct = Array.isArray(discount?.stacked)
  ? discount.stacked.reduce((acc, d) => acc + d.percent, 0)
  : Math.min(Math.max(discount?.percent || 0, 0), 100);`}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

