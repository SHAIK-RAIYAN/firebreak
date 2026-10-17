"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function CtaSection() {
  return (
    <section className="py-24 border-t border-[var(--line)] bg-[var(--bg)] relative overflow-hidden">
      {/* Hairline Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="font-mono text-xs text-[var(--accent)] tracking-wider mb-3">
            [ READY FOR PRODUCTION ]
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-[var(--fg)]">
            Ship on Friday.
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[var(--fg-muted)] mt-1">
            Sleep on Saturday.
          </h3>
          <p className="text-[var(--fg-muted)] max-w-xl mx-auto text-base sm:text-lg mt-4">
            Stop guessing during outages. Connect your GitHub repository and Vercel project in sixty seconds.
          </p>
          <div className="pt-6 flex justify-center">
            <Link
              href="/app"
              className="px-8 py-3.5 rounded-xl font-bold font-mono text-sm bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--accent-solid)]/20 flex items-center gap-2 group"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
