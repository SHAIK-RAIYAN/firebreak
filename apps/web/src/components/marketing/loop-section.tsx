"use client";

import { useState } from "react";
import { Check, ShieldCheck, Flame, GitCommit, Play, RotateCcw, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STEPS = [
  {
    num: "01",
    tag: "DETECT",
    title: "Signed alert intake",
    desc: "A signed HMAC alert opens an incident with zero replay risk.",
    panel: "alert",
  },
  {
    num: "02",
    tag: "TRACE",
    title: "Deterministic ranking",
    desc: "Git commit diffs ranked by stack trace, symbols, and files. No AI hallucinations.",
    panel: "suspects",
  },
  {
    num: "03",
    tag: "PROPOSE",
    title: "Preflight verified rollback",
    desc: "Preflight checks guarantee the target is ready, production hasn't drifted, and errors are active.",
    panel: "preflight",
  },
  {
    num: "04",
    tag: "APPROVE",
    title: "Human in the loop",
    desc: "Zero autonomous mutations. A human holds to confirm before a single route moves.",
    panel: "approval",
  },
  {
    num: "05",
    tag: "EXECUTE",
    title: "Atomic Vercel swap",
    desc: "Instant, zero-downtime production alias swap back to the known-good deployment.",
    panel: "execute",
  },
  {
    num: "06",
    tag: "VERIFY",
    title: "Probe recovery streak",
    desc: "Automated HTTP probes prove 3 consecutive healthy responses before marking resolved.",
    panel: "verify",
  },
];

export function LoopSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="loop" className="py-24 border-t border-[var(--line)] bg-[var(--bg-raised)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4 font-mono text-xs text-[var(--accent)] tracking-wider">
          <span>[02]</span>
          <span>THE INCIDENT RESPONSE LOOP</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)] mb-4">
          One continuous loop. No panic.
        </h2>
        <p className="text-[var(--fg-muted)] max-w-2xl text-base sm:text-lg mb-12">
          From the first 500 error to verified recovery in under two minutes.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step selector */}
          <div className="lg:col-span-5 space-y-2">
            {STEPS.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-4 rounded-xl border relative transition-all duration-200 flex items-start gap-4 ${
                    isActive
                      ? "bg-[var(--surface)] border-[var(--accent)] shadow-sm"
                      : "bg-transparent border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--fg-muted)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-loop-tab"
                      className="absolute inset-0 rounded-xl border border-[var(--accent)] bg-[var(--surface)] -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span
                    className={`font-mono text-sm font-bold px-2 py-0.5 rounded transition-colors ${
                      isActive
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "bg-[var(--surface)] text-[var(--fg-subtle)]"
                    }`}
                  >
                    {step.num}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-semibold text-sm sm:text-base ${
                          isActive ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-subtle)]">
                        {step.tag}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--fg-subtle)] mt-1">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive display panel */}
          <div className="lg:col-span-7">
            <div className="border border-[var(--line)] bg-[var(--surface)] rounded-2xl p-6 shadow-xl relative min-h-[460px] flex flex-col justify-between">
              {/* Loop rail header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] mb-6">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--ember)]" />
                  <span className="text-[var(--fg)] font-semibold">INC-01: CHECKOUT API DEPLOYMENT</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--fg-subtle)]">
                  <span>STEP</span>
                  <span className="text-[var(--accent)] font-bold">{STEPS[activeStep]?.num ?? "01"}</span>
                  <span>/ 06</span>
                </div>
              </div>

              {/* Dynamic Panel Content with AnimatePresence */}
              <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                {activeStep === 0 && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-3 bg-[var(--bg-raised)] border border-[var(--ok)]/30 rounded-lg text-[var(--ok)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>HMAC-SHA256 signature verified</span>
                      </div>
                      <span className="text-[10px] text-[var(--fg-subtle)]">t: 1729174447</span>
                    </div>
                    <pre className="p-4 bg-[var(--bg)] border border-[var(--line)] rounded-lg text-[var(--fg-muted)] overflow-x-auto text-[11px]">
{`{
  "event": "alert.triggered",
  "serviceId": "svc_demo_shop",
  "status": 500,
  "error": "Pricing invariant failed: expected 6120, got NaN",
  "location": "lib/pricing.ts:47:12 (applyDiscount)"
}`}
                    </pre>
                    <div className="flex items-center gap-2 text-[var(--ember)] text-xs font-semibold">
                      <Flame className="w-4 h-4 animate-bounce" />
                      <span>Incident #1 opened · Triggering automated commit trace pipeline</span>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="text-xs text-[var(--fg-muted)] mb-2">
                      Ranked suspects across 3 commits (GitHub API compare):
                    </div>
                    <div className="p-3 bg-[var(--bg-raised)] border-2 border-[var(--danger)]/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)] text-[10px] font-bold">
                            RANK 1
                          </span>
                          <span className="font-semibold text-[var(--fg)]">41ee4db</span>
                        </div>
                        <span className="text-[var(--danger)] font-bold text-sm">+79 pts</span>
                      </div>
                      <p className="text-xs text-[var(--fg-muted)]">refactor: support stacked discounts</p>
                      <div className="w-full bg-[var(--bg)] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[var(--danger)] h-full w-[79%]" />
                      </div>
                      <div className="text-[10px] text-[var(--fg-subtle)] flex gap-3">
                        <span>file: lib/pricing.ts (+40)</span>
                        <span>symbol: applyDiscount (+25)</span>
                        <span>token: NaN (+10)</span>
                        <span>recent (+4)</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-[var(--bg-raised)]/60 border border-[var(--line)] rounded-lg opacity-70 flex items-center justify-between">
                      <span className="text-[var(--fg-muted)]">3ab9d04 chore: update copy in banner</span>
                      <span className="text-[var(--fg-subtle)]">+4 pts</span>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--bg-raised)] border border-[var(--line)] rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[var(--fg-subtle)]">ROLLBACK PROPOSAL</span>
                        <span className="text-[var(--info)] font-semibold">PREFLIGHT PASSED</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2 bg-[var(--surface)] rounded border border-[var(--line)]">
                          <span className="text-[var(--fg-subtle)] block text-[10px]">CURRENT BROKEN</span>
                          <span className="text-[var(--danger)] font-bold">41ee4db</span>
                        </div>
                        <div className="p-2 bg-[var(--surface)] rounded border border-[var(--line)]">
                          <span className="text-[var(--fg-subtle)] block text-[10px]">TARGET HEALTHY</span>
                          <span className="text-[var(--ok)] font-bold">533a8aa</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px] pt-1">
                        <div className="flex items-center gap-2 text-[var(--ok)]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Target deployment exists and ready in Vercel</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--ok)]">
                          <Check className="w-3.5 h-3.5" />
                          <span>No drift: live production matches broken commit</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--ok)]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Health check confirms active 500 error</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-6 text-center py-4">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ShieldCheck className="w-12 h-12 text-[var(--accent)] mx-auto animate-pulse" />
                      <h4 className="font-bold text-base text-[var(--fg)]">Operator Confirmation Required</h4>
                      <p className="text-xs text-[var(--fg-muted)]">
                        Firebreak never modifies production without human authorization.
                      </p>
                    </div>
                    <div className="max-w-xs mx-auto">
                      <button
                        type="button"
                        className="w-full py-3 px-6 rounded-xl font-bold font-mono text-sm bg-[var(--danger)] text-white shadow-lg shadow-[var(--danger)]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Flame className="w-4 h-4" />
                        <span>HOLD TO ROLL BACK</span>
                      </button>
                      <span className="text-[10px] text-[var(--fg-subtle)] font-mono block mt-2">
                        Approval expires in 14m 32s · Workspace: ws_demo
                      </span>
                    </div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-4 bg-[var(--bg-raised)] border border-[var(--accent)]/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--accent)] font-semibold flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          <span>Vercel Alias Mutation in Progress...</span>
                        </span>
                        <span className="text-[10px] text-[var(--fg-subtle)]">id: act_01</span>
                      </div>
                      <div className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-lg text-[11px] space-y-1">
                        <div className="text-[var(--fg-muted)]">POST https://api.vercel.com/v2/deployments/.../aliases</div>
                        <div className="text-[var(--ok)]">→ 200 OK: firebreak-demo.vercel.app reassigned</div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--fg-subtle)] pt-1">
                        <span>Previous: dpl_broken (41ee4db)</span>
                        <span className="text-[var(--ok)] font-semibold">Active: dpl_healthy (533a8aa)</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 5 && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-4 bg-[var(--bg-raised)] border border-[var(--ok)]/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--ok)] font-bold flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          <span>RECOVERY VERIFIED: 3/3 PROBES HEALTHY</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--ok)]/15 text-[var(--ok)] font-semibold text-[10px]">
                          RESOLVED
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-[var(--ok)]/10 border border-[var(--ok)]/20 rounded text-center">
                          <span className="text-[10px] text-[var(--fg-subtle)] block">PROBE 1</span>
                          <span className="text-[var(--ok)] font-bold text-sm">200 OK</span>
                          <span className="text-[10px] text-[var(--fg-muted)] block">34ms</span>
                        </div>
                        <div className="p-2.5 bg-[var(--ok)]/10 border border-[var(--ok)]/20 rounded text-center">
                          <span className="text-[10px] text-[var(--fg-subtle)] block">PROBE 2</span>
                          <span className="text-[var(--ok)] font-bold text-sm">200 OK</span>
                          <span className="text-[10px] text-[var(--fg-muted)] block">28ms</span>
                        </div>
                        <div className="p-2.5 bg-[var(--ok)]/10 border border-[var(--ok)]/20 rounded text-center">
                          <span className="text-[10px] text-[var(--fg-subtle)] block">PROBE 3</span>
                          <span className="text-[var(--ok)] font-bold text-sm">200 OK</span>
                          <span className="text-[10px] text-[var(--fg-muted)] block">31ms</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--fg-muted)] text-center pt-2">
                        Total incident duration: <span className="text-[var(--fg)] font-bold">65 seconds</span>. Zero manual rollbacks.
                      </div>
                    </div>
                  </div>
                )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Step indicator footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)] mt-6 text-xs font-mono text-[var(--fg-subtle)]">
                <span>PRESS ANY STEP ON LEFT TO EXPLORE</span>
                <button
                  onClick={() => setActiveStep((prev) => (prev + 1) % STEPS.length)}
                  className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Next Step</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
