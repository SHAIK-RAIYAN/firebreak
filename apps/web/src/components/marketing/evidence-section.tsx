"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export function EvidenceSection() {
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <section id="evidence" className="py-24 border-t border-[var(--line)] bg-[var(--bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-4 font-mono text-xs text-[var(--accent)] tracking-wider"
        >
          <span>[03]</span>
          <span>EVIDENCE, NOT GUESSES</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)] mb-4"
        >
          Every suspect comes with receipts.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-[var(--fg-muted)] max-w-2xl text-base sm:text-lg mb-12"
        >
          Firebreak uses deterministic static analysis to score suspect commits before AI ever sees them.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          {/* Left: Code Diff with highlighted error */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-7 bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden shadow-lg font-mono text-xs"
          >
            {/* Diff header */}
            <div className="bg-[var(--bg-raised)] px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ember)]" />
                <span className="font-semibold text-[var(--fg)]">lib/pricing.ts</span>
              </div>
              <span className="text-[10px] text-[var(--fg-subtle)]">commit: 41ee4db</span>
            </div>

            {/* Error banner above diff */}
            <div className="p-3 bg-[var(--danger)]/10 border-b border-[var(--danger)]/20 text-[var(--danger)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                TypeError: Cannot read properties of undefined (reading{" "}
                <span className="font-bold underline decoration-[var(--ember)] text-[var(--ember)]">
                  &apos;reduce&apos;
                </span>
                )
              </span>
            </div>

            {/* Diff lines */}
            <div className="p-4 space-y-1 overflow-x-auto text-[11px] leading-relaxed">
              <div className="text-[var(--fg-subtle)]">@@ -32,7 +32,9 @@ export function applyDiscount(totalCents, discount) &#123;</div>
              <div className="text-[var(--fg-muted)]">   if (!discount) return totalCents;</div>
              <div className="bg-[var(--danger)]/15 text-[var(--danger)] -mx-4 px-4 py-0.5">
                -  const pct = Math.min(Math.max(discount.percent, 0), 100);
              </div>
              <div className="bg-[var(--ok)]/15 text-[var(--ok)] -mx-4 px-4 py-0.5">
                +  // Refactor: support stacked discount rules
              </div>
              <div className="bg-[var(--ok)]/15 text-[var(--ok)] -mx-4 px-4 py-0.5 font-bold">
                +  const totalPct = discount.stacked.reduce((acc, d) =&gt; acc + d.percent, 0);
              </div>
              <div className="text-[var(--fg-muted)]">   return Math.round(totalCents * (1 - totalPct / 100));</div>
              <div className="text-[var(--fg-muted)]"> &#125;</div>
            </div>
          </motion.div>

          {/* Right: Deterministic point breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-5 bg-[var(--bg-raised)] border border-[var(--line)] rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
              <span className="font-mono text-xs text-[var(--fg-subtle)] uppercase tracking-wider">
                SCORE BREAKDOWN
              </span>
              <span className="font-mono text-xl font-bold text-[var(--danger)]">79 PTS</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-[var(--surface)] hover:bg-[var(--line)]/50 transition-colors">
                <span className="text-[var(--fg)]">file: lib/pricing.ts</span>
                <span className="font-bold text-[var(--accent)]">+40 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[var(--surface)] hover:bg-[var(--line)]/50 transition-colors">
                <span className="text-[var(--fg)]">symbol: applyDiscount</span>
                <span className="font-bold text-[var(--accent)]">+25 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[var(--surface)] hover:bg-[var(--line)]/50 transition-colors">
                <span className="text-[var(--fg)]">error token: &apos;reduce&apos;</span>
                <span className="font-bold text-[var(--accent)]">+10 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[var(--surface)] hover:bg-[var(--line)]/50 transition-colors">
                <span className="text-[var(--fg)]">recency: newest deployment</span>
                <span className="font-bold text-[var(--accent)]">+4 pts</span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--fg-subtle)] font-mono mt-4">
              Deterministic ranking engine. Identical diffs and stack traces produce mathematically identical rankings.
            </p>
          </motion.div>
        </div>

        {/* Collapsible Advisory Explanation */}
        <div className="border border-[var(--line)] rounded-xl bg-[var(--surface)] overflow-hidden shadow-sm">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-raised)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-mono font-bold uppercase tracking-wider">
                ADVISORY · CLAUDE SONNET 3.5
              </span>
              <span className="font-semibold text-sm text-[var(--fg)]">
                Automated Root Cause Analysis &amp; Suggested Patch
              </span>
            </div>
            {showExplanation ? (
              <ChevronUp className="w-4 h-4 text-[var(--fg-subtle)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--fg-subtle)]" />
            )}
          </button>

          {showExplanation && (
            <div className="px-6 pb-6 pt-2 border-t border-[var(--line)] space-y-4 text-xs font-mono">
              <div className="text-[var(--fg-muted)] leading-relaxed">
                <p className="mb-2">
                  <span className="font-bold text-[var(--fg)]">Summary:</span> Commit 41ee4db assumed{" "}
                  <code className="text-[var(--accent)]">discount.stacked</code> is always defined as an array. When a
                  legacy single-discount object is provided (e.g. &#123; percent: 10 &#125;), accessing{" "}
                  <code className="text-[var(--danger)]">discount.stacked.reduce</code> throws a TypeError, causing deep
                  health check failure.
                </p>
                <p>
                  <span className="font-bold text-[var(--fg)]">Recommended Fix:</span> Fall back to single discount if{" "}
                  <code className="text-[var(--accent)]">discount.stacked</code> is undefined:
                </p>
              </div>

              <pre className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-lg text-[11px] text-[var(--ok)] overflow-x-auto">
{`const totalPct = Array.isArray(discount?.stacked)
  ? discount.stacked.reduce((acc, d) => acc + d.percent, 0)
  : Math.min(Math.max(discount?.percent || 0, 0), 100);`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
