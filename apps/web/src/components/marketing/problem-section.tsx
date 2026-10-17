"use client";

import { Zap, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

const COMPARISONS = [
  { time: "02:14 → 02:18", question: "Which deploy is live in production right now?", automated: "Instant API lookup" },
  { time: "02:18 → 02:24", question: "What code changed since the last known-healthy deploy?", automated: "Git compare diff" },
  { time: "02:24 → 02:31", question: "Which commit touches the error location & stack trace?", automated: "Deterministic ranking" },
  { time: "02:31 → 02:37", question: "Is it safe to roll back? Did another deploy sneak in?", automated: "Live preflight drift check" },
  { time: "02:37 → 02:44", question: "Did the rollback actually recover users?", automated: "Automated probe streak" },
];

export function ProblemSection() {
  return (
    <section id="problem" className="py-24 border-t border-[var(--line)] bg-[var(--bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-4 font-mono text-xs text-[var(--accent)] tracking-wider"
        >
          <span>[01]</span>
          <span>THE FIRST 20 MINUTES</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-5 space-y-4"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)] leading-tight">
              The slowest part of an incident is the part a script could do.
            </h2>
            <p className="text-[var(--fg-muted)] text-base sm:text-lg leading-relaxed">
              When production goes down at 3 AM, engineers waste twenty minutes asking manual questions before writing a single fix.
            </p>
            <div className="p-4 bg-[var(--surface)] border border-[var(--line)] rounded-xl space-y-2 font-mono text-xs text-[var(--fg-subtle)] group hover:border-[var(--line-strong)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--accent)] font-semibold">
                <Zap className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-200" />
                <span>FIREBREAK AUTOMATION PRINCIPLE</span>
              </div>
              <p className="text-[var(--fg-muted)]">
                Gather receipts, rank culprits, verify preflight safety, and wait for a single operator tap.
              </p>
            </div>
          </motion.div>

          {/* Right Column: Clock list */}
          <div className="lg:col-span-7 space-y-3">
            {COMPARISONS.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: idx * 0.08, ease: "easeOut" }}
                whileHover={{ x: 4 }}
                className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--danger)] line-through opacity-75 font-semibold shrink-0">
                    {item.time}
                  </span>
                  <span className="text-[var(--fg)] font-medium font-sans text-sm">{item.question}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--ok)] shrink-0 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                  <span>{item.automated}</span>
                </div>
              </motion.div>
            ))}

            {/* Final Firebreak outcome card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: 0.4 }}
              className="p-4 rounded-xl border-2 border-[var(--ok)]/40 bg-[var(--ok)]/10 flex items-center justify-between font-mono text-xs text-[var(--ok)] shadow-sm"
            >
              <span className="font-bold text-sm">WITH FIREBREAK: 02:14 → 02:15</span>
              <span className="font-semibold text-xs uppercase tracking-wider">65 SECONDS TOTAL</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
