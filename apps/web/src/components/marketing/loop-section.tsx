"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  Check,
  Clock,
  Flame,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    tag: "DETECT",
    title: "Signed alert intake",
    desc: "HMAC signed alert with replay defense.",
    panel: "alert",
  },
  {
    num: "02",
    tag: "TRACE",
    title: "Deterministic ranking",
    desc: "Commits ranked by trace & diff symbols.",
    panel: "suspects",
  },
  {
    num: "03",
    tag: "PROPOSE",
    title: "Preflight verified rollback",
    desc: "Zero drift & target readiness verified.",
    panel: "preflight",
  },
  {
    num: "04",
    tag: "APPROVE",
    title: "Human in the loop",
    desc: "Explicit operator confirmation required.",
    panel: "approval",
  },
  {
    num: "05",
    tag: "EXECUTE",
    title: "Atomic Vercel swap",
    desc: "Zero-downtime production alias swap.",
    panel: "execute",
  },
  {
    num: "06",
    tag: "VERIFY",
    title: "Probe recovery streak",
    desc: "Probes prove 3/3 healthy responses.",
    panel: "verify",
  },
];

function StepDetailContent({ stepIndex }: { stepIndex: number }) {
  const [approvalState, setApprovalState] = useState<"idle" | "rolling_back" | "success">("idle");

  if (stepIndex === 0) {
    return (
      <div className="space-y-3.5 font-mono text-xs">
        <div className="p-3 bg-(--bg-raised) border border-(--ok)/30 rounded-lg text-(--ok) flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-semibold">HMAC-SHA256 signature verified</span>
          </div>
          <span className="text-[10px] text-(--fg-subtle) font-mono">t: 1729174447</span>
        </div>
        <pre className="p-3.5 bg-(--bg) border border-(--line) rounded-lg text-(--fg-muted) overflow-x-auto text-[11px] leading-relaxed">
          {`{
    "event": "alert.triggered",
    "serviceId": "svc_demo_shop",
    "status": 500,
    "error": "Pricing invariant failed: expected 6120, got NaN",
    "location": "lib/pricing.ts:47:12"
  }`}
        </pre>
        <div className="flex items-center gap-2 text-(--ember) text-xs font-semibold p-2.5 bg-(--ember)/10 border border-(--ember)/20 rounded-lg">
          <Flame className="w-4 h-4 shrink-0 animate-pulse text-(--ember)" />
          <span>Incident #1 opened · Triggering automated commit trace pipeline</span>
        </div>
      </div>
    );
  }

  if (stepIndex === 1) {
    return (
      <div className="space-y-2.5 font-mono text-xs">
        <div className="text-xs text-(--fg-muted) flex items-center justify-between">
          <span>Ranked suspects across 3 commits:</span>
          <span className="text-[10px] text-(--fg-subtle) font-mono">GitHub API compare</span>
        </div>
        <div className="p-3 bg-(--bg-raised) border-2 border-(--danger)/50 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-(--danger)/20 text-(--danger) text-[10px] font-bold">
                RANK 1
              </span>
              <span className="font-semibold text-(--fg)">41ee4db</span>
            </div>
            <span className="text-(--danger) font-bold text-sm">+79 pts</span>
          </div>
          <p className="text-xs text-(--fg-muted)">refactor: support stacked discounts</p>
          <div className="w-full bg-(--bg) rounded-full h-1.5 overflow-hidden">
            <div className="bg-(--danger) h-full w-[79%] rounded-full" />
          </div>
          <div className="text-[10px] text-(--fg-subtle) flex flex-wrap gap-1.5 pt-0.5">
            <span className="px-1.5 py-0.5 bg-(--surface) rounded border border-(--line)">file: lib/pricing.ts (+40)</span>
            <span className="px-1.5 py-0.5 bg-(--surface) rounded border border-(--line)">symbol: applyDiscount (+25)</span>
            <span className="px-1.5 py-0.5 bg-(--surface) rounded border border-(--line)">token: NaN (+10)</span>
            <span className="px-1.5 py-0.5 bg-(--surface) rounded border border-(--line)">recent (+4)</span>
          </div>
        </div>
        <div className="p-2 bg-(--bg-raised)/60 border border-(--line) rounded-lg flex items-center justify-between text-xs">
          <span className="text-(--fg-muted)">3ab9d04 chore: update banner copy</span>
          <span className="text-(--fg-subtle)">+4 pts</span>
        </div>
        <div className="p-2 bg-(--bg-raised)/40 border border-(--line) rounded-lg flex items-center justify-between text-[11px]">
          <span className="text-(--fg-subtle)">109b8ce docs: update checklist</span>
          <span className="text-(--fg-subtle)">0 pts</span>
        </div>
      </div>
    );
  }

  if (stepIndex === 2) {
    return (
      <div className="space-y-3.5">
        <div className="p-4 bg-(--bg-raised) border border-(--line) rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-(--fg-subtle)">ROLLBACK PROPOSAL</span>
            <span className="text-(--ok) font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>3/3 PREFLIGHT PASSED</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-(--surface) rounded-lg border border-(--line)">
              <span className="text-(--fg-subtle) block text-[10px]">CURRENT BROKEN</span>
              <span className="text-(--danger) font-bold text-sm">41ee4db</span>
              <span className="text-[10px] text-(--fg-muted) block truncate mt-0.5">stacked discounts</span>
            </div>
            <div className="p-2.5 bg-(--surface) rounded-lg border border-(--line)">
              <span className="text-(--fg-subtle) block text-[10px]">TARGET HEALTHY</span>
              <span className="text-(--ok) font-bold text-sm">533a8aa</span>
              <span className="text-[10px] text-(--fg-muted) block truncate mt-0.5">stable discount engine</span>
            </div>
          </div>
          <div className="space-y-1.5 font-mono text-[11px] pt-1 border-t border-(--line)">
            <div className="flex items-center gap-2 text-(--ok)">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Target deployment exists and ready in Vercel</span>
            </div>
            <div className="flex items-center gap-2 text-(--ok)">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>No drift: live production matches broken commit</span>
            </div>
            <div className="flex items-center gap-2 text-(--ok)">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Health check confirms active 500 error</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stepIndex === 3) {
    if (approvalState === "rolling_back") {
      return (
        <div className="space-y-4 text-center py-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-2xl bg-(--accent)/10 text-(--accent) flex items-center justify-center mx-auto border border-(--accent)/30">
            <RotateCcw className="w-6 h-6 animate-spin text-(--accent)" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-(--fg)">Rolling back to 533a8aa...</h4>
            <p className="text-xs text-(--accent) font-mono">
              Atomic Vercel alias swap in progress
            </p>
          </div>
          <div className="max-w-xs mx-auto p-3 bg-(--bg) border border-(--line) rounded-xl font-mono text-[11px] space-y-2 text-left">
            <div className="flex items-center gap-2 text-(--ok)">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Operator signature authorized</span>
            </div>
            <div className="flex items-center gap-2 text-(--accent) animate-pulse">
              <RotateCcw className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>Reassigning production DNS alias</span>
            </div>
          </div>
        </div>
      );
    }

    if (approvalState === "success") {
      return (
        <div className="space-y-3.5 text-center py-2 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-12 h-12 rounded-2xl bg-(--ok)/15 text-(--ok) flex items-center justify-center mx-auto border border-(--ok)/30">
            <Check className="w-6 h-6 text-(--ok)" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-(--fg)">Rollback Successful</h4>
            <p className="text-xs text-(--ok) font-medium">
              Your production deployment is safe and healthy.
            </p>
          </div>
          <div className="max-w-xs mx-auto p-3 bg-(--bg) border border-(--ok)/30 rounded-xl font-mono text-[11px] space-y-1.5 text-left">
            <div className="flex items-center justify-between text-(--fg-subtle)">
              <span>ACTIVE DEPLOYMENT</span>
              <span className="text-(--ok) font-semibold">533a8aa (healthy)</span>
            </div>
            <div className="flex items-center justify-between text-(--fg-subtle)">
              <span>PROBE RESPONSE</span>
              <span className="text-(--ok) font-semibold">200 OK · 28ms</span>
            </div>
            <div className="flex items-center justify-between text-(--fg-subtle)">
              <span>ERROR COUNT</span>
              <span className="text-(--ok) font-semibold">0 errors (100% streak)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApprovalState("idle")}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--accent) hover:underline pt-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset interactive demo</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-center py-2">
        <div className="max-w-sm mx-auto space-y-1.5">
          <div className="w-11 h-11 rounded-2xl bg-(--accent)/10 text-(--accent) flex items-center justify-center mx-auto border border-(--accent)/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-base text-(--fg)">Operator Confirmation Required</h4>
          <p className="text-xs text-(--fg-muted)">
            Firebreak never modifies production without human authorization.
          </p>
        </div>
        <div className="max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              setApprovalState("rolling_back");
              setTimeout(() => {
                setApprovalState("success");
              }, 1400);
            }}
            className="w-full py-3 px-6 rounded-xl font-bold font-mono text-sm bg-(--danger) text-white shadow-lg shadow-(--danger)/20 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
          >
            <Flame className="w-4 h-4 text-white" />
            <span>CONFIRM ROLLBACK</span>
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-(--fg-subtle) font-mono mt-2.5">
            <Clock className="w-3 h-3" />
            <span>Expires in 14m 32s </span>
          </div>
        </div>
      </div>
    );
  }

  if (stepIndex === 4) {
    return (
      <div className="space-y-3.5 font-mono text-xs">
        <div className="p-4 bg-(--bg-raised) border border-(--accent)/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-(--accent) font-semibold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 animate-spin text-(--accent)" />
              <span>Vercel Alias Mutation in Progress...</span>
            </span>
            <span className="text-[10px] text-(--fg-subtle)">id: act_01</span>
          </div>
          <div className="p-3 bg-(--bg) border border-(--line) rounded-lg text-[11px] space-y-1">
            <div className="text-(--fg-muted)">POST https://api.vercel.com/v2/deployments/.../aliases</div>
            <div className="text-(--ok) font-medium">→ 200 OK: firebreak-demo.vercel.app reassigned</div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-(--fg-subtle) pt-1 border-t border-(--line)">
            <span>Previous: dpl_broken (41ee4db)</span>
            <span className="text-(--ok) font-semibold">Active: dpl_healthy (533a8aa)</span>
          </div>
        </div>
      </div>
    );
  }

  // stepIndex === 5
  return (
    <div className="space-y-3.5 font-mono text-xs">
      <div className="p-4 bg-(--bg-raised) border border-(--ok)/40 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-(--ok) font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-(--ok)" />
            <span>RECOVERY VERIFIED: 3/3 PROBES HEALTHY</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-(--ok)/15 text-(--ok) font-semibold text-[10px]">
            RESOLVED
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-(--ok)/10 border border-(--ok)/20 rounded-lg text-center">
            <span className="text-[10px] text-(--fg-subtle) block">PROBE 1</span>
            <span className="text-(--ok) font-bold text-sm">200 OK</span>
            <span className="text-[10px] text-(--fg-muted) block mt-0.5">34ms</span>
          </div>
          <div className="p-2.5 bg-(--ok)/10 border border-(--ok)/20 rounded-lg text-center">
            <span className="text-[10px] text-(--fg-subtle) block">PROBE 2</span>
            <span className="text-(--ok) font-bold text-sm">200 OK</span>
            <span className="text-[10px] text-(--fg-muted) block mt-0.5">28ms</span>
          </div>
          <div className="p-2.5 bg-(--ok)/10 border border-(--ok)/20 rounded-lg text-center">
            <span className="text-[10px] text-(--fg-subtle) block">PROBE 3</span>
            <span className="text-(--ok) font-bold text-sm">200 OK</span>
            <span className="text-[10px] text-(--fg-muted) block mt-0.5">31ms</span>
          </div>
        </div>
        <div className="text-[11px] text-(--fg-muted) text-center pt-2 border-t border-(--line)">
          Total incident duration: <span className="text-(--fg) font-bold">65 seconds</span> · Zero manual rollbacks.
        </div>
      </div>
    </div>
  );
}

const STEP_WINDOWS = [
  { min: 0.0, max: 0.18, center: 0.09 },
  { min: 0.18, max: 0.34, center: 0.26 },
  { min: 0.34, max: 0.5, center: 0.42 },
  { min: 0.5, max: 0.66, center: 0.58 },
  { min: 0.66, max: 0.82, center: 0.74 },
  { min: 0.82, max: 1.0, center: 0.91 },
];

export function LoopSection() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const pinnedContentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      if (!desktopContainerRef.current || !pinnedContentRef.current) return;

      const st = ScrollTrigger.create({
        trigger: desktopContainerRef.current,
        pin: pinnedContentRef.current,
        start: "top top+=64px",
        end: "+=3800",
        pinSpacing: true,
        anticipatePin: 0,
        onUpdate: (self) => {
          const progress = self.progress;
          let step = 0;
          for (let i = 0; i < STEP_WINDOWS.length; i++) {
            const w = STEP_WINDOWS[i];
            if (!w) continue;
            if (
              progress >= w.min &&
              (progress < w.max || i === STEP_WINDOWS.length - 1)
            ) {
              step = i;
              break;
            }
          }
          setActiveStep(step);
        },
      });

      triggerRef.current = st;

      // Ensure coordinates are calculated accurately with Lenis
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      return () => {
        st.kill();
        triggerRef.current = null;
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    const st = triggerRef.current;
    if (!st) return;

    // Scroll to the exact center of the target step's scroll progress window
    const targetProgress = STEP_WINDOWS[index]?.center ?? (index + 0.5) / STEPS.length;
    const targetScroll = st.start + targetProgress * (st.end - st.start);

    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: unknown) => void } }).__lenis;
    if (lenis) {
      lenis.scrollTo(targetScroll, {
        duration: 0.85,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  };

  return (
    <section id="loop" ref={sectionRef} className="border-t border-(--line) bg-(--bg-raised) relative">
      {/* ─────────────────────────────────────────────────────────────
            Desktop: Pinned Scroll-Driven Storytelling Experience
        ───────────────────────────────────────────────────────────── */}
      <div ref={desktopContainerRef} className="hidden lg:block motion-reduce:lg:hidden relative">
        <div
          ref={pinnedContentRef}
          className="w-full h-[calc(100svh-4rem)] max-h-[calc(100svh-4rem)] flex flex-col justify-center overflow-hidden py-4 sm:py-6"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 font-mono text-xs text-(--accent) tracking-wider">
                <span>[02]</span>
                <span>THE INCIDENT RESPONSE LOOP</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-3xl font-bold font-display tracking-tight text-(--fg)">
                  One continuous loop. No panic.
                </h2>
                <p className="text-(--fg-muted) text-sm max-w-md hidden xl:block text-right">
                  From the first 500 error to verified recovery in under two minutes.
                </p>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-12 gap-8 items-center">
              {/* Left: Clean Typographic Step Indicators (Unboxed, with animated strikethroughs) */}
              <div className="col-span-5 space-y-2.5">
                {STEPS.map((step, idx) => {
                  const isActive = activeStep === idx;
                  const isCompleted = idx < activeStep;

                  return (
                    <button
                      key={step.num}
                      onClick={() => handleStepClick(idx)}
                      disabled={isActive}
                      aria-current={isActive ? "step" : undefined}
                      className={`w-full text-left relative pl-5 pr-4 py-2.5 rounded-xl group transition-all duration-200 flex items-center gap-3.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-(--accent) ${
                        isActive
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-(--surface)/40"
                      }`}
                    >
                      {/* Active subtle background pill & left vertical accent bar */}
                      {isActive && (
                        <>
                          <motion.div
                            layoutId="loop-active-indicator"
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-(--accent) shadow-sm shadow-(--accent)/50"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                          <motion.div
                            layoutId="loop-active-bg"
                            className="absolute inset-0 rounded-xl bg-(--surface)/80 dark:bg-(--surface)/50 -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        </>
                      )}

                      {/* Step indicator: completed checkmark / active glowing badge / upcoming muted badge */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="w-6 h-6 rounded-full bg-(--ok)/15 border border-(--ok)/35 text-(--ok) flex items-center justify-center"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </motion.div>
                        ) : isActive ? (
                          <div className="w-6 h-6 rounded-full bg-(--accent) text-(--accent-fg) flex items-center justify-center font-mono text-[11px] font-bold shadow-sm shadow-(--accent)/30">
                            {step.num}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-(--surface) border border-(--line) text-(--fg-subtle) flex items-center justify-center font-mono text-[11px] group-hover:border-(--line-strong) group-hover:text-(--fg-muted) transition-colors">
                            {step.num}
                          </div>
                        )}
                      </div>

                      {/* Text Area */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="relative inline-block truncate">
                            <span
                              className={`font-semibold text-sm transition-colors duration-200 ${
                                isActive
                                  ? "text-(--fg) font-bold"
                                  : isCompleted
                                  ? "text-(--fg-subtle)"
                                  : "text-(--fg-muted) group-hover:text-(--fg)"
                              }`}
                            >
                              {step.title}
                            </span>
                            {/* Clean animated strikethrough across title */}
                            <motion.span
                              initial={false}
                              animate={{
                                scaleX: isCompleted ? 1 : 0,
                                opacity: isCompleted ? 0.75 : 0,
                              }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="absolute left-0 right-0 top-[52%] h-[1.5px] bg-(--fg-subtle) origin-left pointer-events-none"
                            />
                          </div>

                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider shrink-0 transition-colors duration-200 ${
                              isActive
                                ? "text-(--accent) font-semibold"
                                : isCompleted
                                ? "text-(--ok)/70"
                                : "text-(--fg-subtle)"
                            }`}
                          >
                            {step.tag}
                          </span>
                        </div>

                        <div className="relative inline-block truncate mt-0.5 max-w-full">
                          <span
                            className={`text-xs transition-colors duration-200 block truncate ${
                              isActive
                                ? "text-(--fg-muted)"
                                : isCompleted
                                ? "text-(--fg-subtle)/75"
                                : "text-(--fg-subtle)"
                            }`}
                          >
                            {step.desc}
                          </span>
                          {/* Clean animated strikethrough across description */}
                          <motion.span
                            initial={false}
                            animate={{
                              scaleX: isCompleted ? 1 : 0,
                              opacity: isCompleted ? 0.6 : 0,
                            }}
                            transition={{
                              duration: 0.28,
                              delay: 0.04,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="absolute left-0 right-0 top-[52%] h-px bg-(--fg-subtle) origin-left pointer-events-none"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: Interactive Terminal Panel (Stationary Frame) */}
              <div className="col-span-7">
                <div className="border border-(--line) bg-(--surface) rounded-2xl p-5 sm:p-6 shadow-xl relative flex flex-col justify-between h-126 max-h-126 overflow-hidden">
                  {/* Loop rail header (Stationary) */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-(--line) mb-2 shrink-0">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-(--ember) animate-pulse" />
                      <span className="text-(--fg) font-semibold">INC-01: CHECKOUT API DEPLOYMENT</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-(--fg-subtle)">
                      <span>STEP</span>
                      <span className="text-(--accent) font-bold">{STEPS[activeStep]?.num ?? "01"}</span>
                      <span>/ 06</span>
                      <span className="ml-1 text-(--fg-subtle) font-normal hidden sm:inline">
                        ({STEPS[activeStep]?.tag})
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Panel Content Area */}
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeStep}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      >
                        <StepDetailContent stepIndex={activeStep} />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Step indicator footer (Stationary) */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-(--line) mt-2 shrink-0 text-xs font-mono text-(--fg-subtle)">
                    <div className="flex items-center gap-1.5">
                      {STEPS.map((s, idx) => (
                        <button
                          key={s.num}
                          onClick={() => handleStepClick(idx)}
                          className={`h-1.5 rounded-full transition-all duration-200 ${idx === activeStep
                            ? "bg-(--accent) w-8"
                            : idx < activeStep
                              ? "bg-(--ok)/60 w-5"
                              : "bg-(--line-strong) w-5"
                            }`}
                          title={`Jump to step ${s.num}: ${s.tag}`}
                          aria-label={`Jump to step ${s.num}: ${s.tag}`}
                        />
                      ))}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
            Mobile & Reduced Motion: Accessible Stacked Content
        ───────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-(--accent) tracking-wider">
              <span>[02]</span>
              <span>THE INCIDENT RESPONSE LOOP</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-(--fg) mb-2">
              One continuous loop. No panic.
            </h2>
            <p className="text-(--fg-muted) text-sm sm:text-base">
              From the first 500 error to verified recovery in under two minutes.
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map((step, idx) => (
              <div
                key={step.num}
                className="border border-(--line) bg-(--surface) rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-(--line)">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-(--accent) text-(--accent-fg)">
                      {step.num}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base text-(--fg)">{step.title}</h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-(--accent) font-semibold">
                        {step.tag}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-(--fg-subtle)">PHASE {step.num}/06</span>
                </div>
                <p className="text-xs sm:text-sm text-(--fg-muted)">{step.desc}</p>
                <div className="pt-1">
                  <StepDetailContent stepIndex={idx} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

