"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { motion, type Variants } from "motion/react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Interactive hold-to-confirm gate demonstrating the human approval invariant.
 */
function MiniHoldGate() {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const completeAuthorization = useCallback(() => {
    setIsHolding(false);
    setIsAuthorized(true);
    setProgress(100);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setIsAuthorized(false);
      setProgress(0);
    }, 3500);
  }, []);

  const runAnimation = useCallback((durationMs = 800) => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    const start = performance.now();
    setIsHolding(true);

    const step = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (pct >= 100) {
        completeAuthorization();
      } else {
        requestRef.current = requestAnimationFrame(step);
      }
    };
    requestRef.current = requestAnimationFrame(step);
  }, [completeAuthorization]);

  const startHold = useCallback(() => {
    if (isAuthorized) return;
    startTimeRef.current = performance.now();
    runAnimation(800);
  }, [isAuthorized, runAnimation]);

  const endHold = useCallback(() => {
    if (isAuthorized) return;
    const downTime = startTimeRef.current ? performance.now() - startTimeRef.current : 0;
    // If it was a quick click or tap (< 250ms), let it complete the 800ms demo cycle
    if (downTime > 0 && downTime < 250) {
      startTimeRef.current = null;
      return;
    }
    // If intentionally held and released prematurely, abort and reset
    if (downTime >= 250 && progress < 100) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      setIsHolding(false);
      setProgress(0);
    }
    startTimeRef.current = null;
  }, [isAuthorized, progress]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return (
    <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-3.5 font-mono text-xs space-y-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--fg-subtle)] flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isAuthorized ? "bg-[var(--ok)]" : "bg-[var(--warn)]"}`} />
          OPERATOR_GATE
        </span>
        <span className="text-[var(--fg-subtle)] text-[10px]">
          {isAuthorized ? "LEASE ISSUED" : "800ms HOLD"}
        </span>
      </div>

      <button
        type="button"
        onMouseDown={startHold}
        onMouseUp={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (!isHolding && !isAuthorized) startHold();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            endHold();
          }
        }}
        aria-label="Hold to test operator authorization"
        className={`relative overflow-hidden w-full h-8 rounded border text-[11px] font-semibold select-none transition-all flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
          isAuthorized
            ? "bg-[var(--ok)]/15 border-[var(--ok)] text-[var(--ok)]"
            : "bg-[var(--surface)] border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--fg)] cursor-pointer active:scale-[0.99]"
        }`}
      >
        {/* Fill progress track */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent)]/20 pointer-events-none transition-all ease-linear"
          style={{ width: `${progress}%` }}
        />

        <div className="relative z-10 flex items-center gap-1.5">
          {isAuthorized ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>AUTHORIZED · 15m LEASE</span>
            </>
          ) : isHolding ? (
            <span className="text-[var(--accent)]">HOLDING ({Math.round(progress)}%)</span>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-[var(--accent)]" />
              <span>HOLD TO AUTHORIZE</span>
            </>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between text-[10px] text-[var(--fg-subtle)] pt-1.5 border-t border-[var(--line)]">
        <span>TIMEOUT: 15m LEASE</span>
        <span>IDEMPOTENT: 1 ROLLBACK</span>
      </div>
    </div>
  );
}

export function SecuritySection() {
  return (
    <section
      id="security"
      className="py-16 lg:py-24 border-t border-[var(--line)] bg-[var(--bg)] relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 sm:mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-[var(--accent)] tracking-wider">
              <span>[05]</span>
              <span>SECURITY &amp; CONTROL</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)]">
              Safe by construction.
            </h2>
          </div>
          <p className="text-[var(--fg-muted)] text-sm sm:text-base max-w-md">
            Four hard invariants enforced before any route mutation can touch production.
          </p>
        </div>

        {/* 4 Quadrants Monolith Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)] rounded-[10px] overflow-hidden"
        >
          {/* Quadrant 1: Human Approval Gate */}
          <motion.div
            variants={itemVariants}
            className="p-6 sm:p-7 bg-[var(--surface)] hover:bg-[var(--bg-raised)] transition-colors duration-200 flex flex-col justify-between gap-6 group"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] text-[var(--fg-subtle)] mb-2.5">
                <span className="text-[var(--accent)] font-semibold tracking-wider">
                  01 // APPROVAL GATE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-semibold">
                  MANDATORY
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--fg)] tracking-tight mb-1.5">
                Explicit Human Approval
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
                Rollbacks never execute autonomously; an engineer must hold to authorize.
              </p>
            </div>

            {/* Evidence Artifact: Interactive Mini Hold Gate */}
            <MiniHoldGate />
          </motion.div>

          {/* Quadrant 2: Deployment Drift Preflight */}
          <motion.div
            variants={itemVariants}
            className="p-6 sm:p-7 bg-[var(--surface)] hover:bg-[var(--bg-raised)] transition-colors duration-200 flex flex-col justify-between gap-6 group"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] text-[var(--fg-subtle)] mb-2.5">
                <span className="text-[var(--ok)] font-semibold tracking-wider">
                  02 // PREFLIGHT INVARIANT
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--ok)]/10 text-[var(--ok)] text-[10px] font-semibold">
                  ZERO DRIFT
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--fg)] tracking-tight mb-1.5">
                Deployment Drift Verification
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
                Preflight checks abort immediately if live traffic has drifted from the incident deploy.
              </p>
            </div>

            {/* Evidence Artifact: Active Drift Comparator */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-3.5 font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--fg-subtle)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
                  TARGET_DEPLOY
                </span>
                <span className="text-[var(--fg)] font-semibold">41ee4db</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--fg-subtle)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
                  LIVE_PROD_ALIAS
                </span>
                <span className="text-[var(--fg)] font-semibold">41ee4db</span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[var(--line)]">
                <span className="text-[var(--ok)] flex items-center gap-1 font-semibold">
                  <Check className="w-3 h-3" />
                  <span>INVARIANT MATCH (Δ 0ms)</span>
                </span>
                <span className="text-[var(--fg-subtle)]">ABORT ON MISMATCH</span>
              </div>
            </div>
          </motion.div>

          {/* Quadrant 3: AES-256-GCM Envelope Encryption */}
          <motion.div
            variants={itemVariants}
            className="p-6 sm:p-7 bg-[var(--surface)] hover:bg-[var(--bg-raised)] transition-colors duration-200 flex flex-col justify-between gap-6 group"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] text-[var(--fg-subtle)] mb-2.5">
                <span className="text-[var(--ember)] font-semibold tracking-wider">
                  03 // ENVELOPE ENCRYPTION
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--ember)]/10 text-[var(--ember)] text-[10px] font-semibold">
                  AES-256-GCM
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--fg)] tracking-tight mb-1.5">
                AES-256-GCM Encryption
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
                Provider tokens are sealed at rest with tenant-scoped authenticated data.
              </p>
            </div>

            {/* Evidence Artifact: Sealed Key Vault */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-3.5 font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--fg-subtle)]">SEALED_TOKEN</span>
                <span className="text-[var(--fg)] font-semibold tracking-wider">
                  vercel_tok_••••••••9c2e
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--fg-subtle)]">CIPHER_SPEC</span>
                <span className="text-[var(--accent)] font-semibold">AES-256-GCM · 256-BIT</span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[var(--line)] text-[var(--fg-subtle)]">
                <span>AAD: sha256(tenant_id)</span>
                <span className="text-[var(--ok)] font-semibold">128-BIT TAG VERIFIED</span>
              </div>
            </div>
          </motion.div>

          {/* Quadrant 4: Immutable Audit Ledger */}
          <motion.div
            variants={itemVariants}
            className="p-6 sm:p-7 bg-[var(--surface)] hover:bg-[var(--bg-raised)] transition-colors duration-200 flex flex-col justify-between gap-6 group"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] text-[var(--fg-subtle)] mb-2.5">
                <span className="text-[var(--info)] font-semibold tracking-wider">
                  04 // AUDIT LEDGER
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--info)]/10 text-[var(--info)] text-[10px] font-semibold">
                  APPEND-ONLY
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-[var(--fg)] tracking-tight mb-1.5">
                Immutable Audit Timeline
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
                Every alert, suspect ranking, and route mutation is cryptographically signed.
              </p>
            </div>

            {/* Evidence Artifact: Cryptographic Audit Ledger */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-3.5 font-mono text-xs space-y-2">
              <div className="grid grid-cols-[52px_56px_1fr] items-center text-[10px] gap-2">
                <span className="text-[var(--fg-subtle)]">02:14:07</span>
                <span className="text-[var(--warn)] font-semibold">ALERT</span>
                <span className="text-[var(--fg-muted)] truncate">checkout 500 spike</span>
              </div>
              <div className="grid grid-cols-[52px_56px_1fr] items-center text-[10px] gap-2">
                <span className="text-[var(--fg-subtle)]">02:14:09</span>
                <span className="text-[var(--accent)] font-semibold">RANK</span>
                <span className="text-[var(--fg-muted)] truncate">41ee4db (+79 pts)</span>
              </div>
              <div className="grid grid-cols-[52px_56px_1fr] items-center text-[10px] gap-2">
                <span className="text-[var(--fg-subtle)]">02:14:41</span>
                <span className="text-[var(--info)] font-semibold">APPROVE</span>
                <span className="text-[var(--fg-muted)] truncate">operator:on-call</span>
              </div>
              <div className="grid grid-cols-[52px_56px_1fr] items-center text-[10px] gap-2">
                <span className="text-[var(--fg-subtle)]">02:14:42</span>
                <span className="text-[var(--ok)] font-semibold">SWAP</span>
                <span className="text-[var(--fg)] font-semibold truncate">→ 3ab9d04 [VERIFIED]</span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[var(--line)] text-[var(--fg-subtle)]">
                <span>HASH: 0x8f2d...b41a</span>
                <span className="text-[var(--ok)] font-semibold">APPEND-ONLY SEAL</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
