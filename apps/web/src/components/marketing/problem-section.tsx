"use client";

import { Zap, CheckCircle2 } from "lucide-react";
import { motion, type Variants } from "motion/react";

const COMPARISONS = [
  { time: "02:14 → 02:18", question: "Which deploy is live in production right now?", automated: "Instant API lookup" },
  { time: "02:18 → 02:24", question: "What code changed since the last known-healthy deploy?", automated: "Git compare diff" },
  { time: "02:24 → 02:31", question: "Which commit touches the error location & stack trace?", automated: "Deterministic ranking" },
  { time: "02:31 → 02:37", question: "Is it safe to roll back? Did another deploy sneak in?", automated: "Live preflight drift check" },
  { time: "02:37 → 02:44", question: "Did the rollback actually recover users?", automated: "Automated probe streak" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export function ProblemSection() {
  return (
    <section id="problem" className="min-h-[calc(100svh-4rem)] lg:h-[calc(100svh-4rem)] flex items-center py-12 lg:py-0 border-t border-(--line) bg-(--bg) relative overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto"
      >
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 mb-3 font-mono text-xs text-(--accent) tracking-wider"
        >
          <span>[01]</span>
          <span>THE FIRST 20 MINUTES</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 space-y-4"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-(--fg) leading-tight">
              The slowest part of an incident is the part a script could do.
            </h2>
            <p className="text-(--fg-muted) text-base sm:text-lg leading-relaxed">
              When production fails at 3 AM, engineers burn twenty minutes asking manual questions before writing a single line of a fix.
            </p>
            <div className="p-4 bg-(--surface) border border-(--line) rounded-xl space-y-2 font-mono text-xs text-(--fg-subtle) group hover:border-(--line-strong) transition-colors shadow-xs">
              <div className="flex items-center gap-2 text-(--accent) font-semibold">
                <Zap className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                <span>FIREBREAK AUTOMATION PRINCIPLE</span>
              </div>
              <p className="text-(--fg-muted)">
                Collect evidence, pinpoint suspects, verify rollback safety, and stage recovery for a single operator confirmation.
              </p>
            </div>
          </motion.div>

          {/* Right Column: Comparison Timeline Rows */}
          <div className="lg:col-span-7 space-y-2.5">
            {COMPARISONS.map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ x: 3 }}
                className="p-3.5 rounded-xl border border-(--line) bg-(--surface) hover:border-(--line-strong) transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono text-xs group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-(--danger) line-through opacity-75 font-semibold shrink-0">
                    {item.time}
                  </span>
                  <span className="text-(--fg) font-medium font-sans text-sm">{item.question}</span>
                </div>
                <div className="flex items-center gap-1.5 text-(--ok) shrink-0 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                  <span>{item.automated}</span>
                </div>
              </motion.div>
            ))}

            {/* Firebreak outcome banner */}
            <motion.div
              variants={itemVariants}
              className="p-3.5 rounded-xl border-2 border-(--ok)/40 bg-(--ok)/10 flex items-center justify-between font-mono text-xs text-(--ok) shadow-xs"
            >
              <span className="font-bold text-sm">WITH FIREBREAK: 02:14 → 02:15</span>
              <span className="font-semibold text-xs uppercase tracking-wider">65 SECONDS TO RECOVERY</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
