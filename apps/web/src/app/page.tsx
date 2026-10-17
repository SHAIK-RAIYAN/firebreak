import Link from "next/link";
import { ArrowRight, Flame, Shield, Terminal, ExternalLink } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AsciiFire } from "@/components/marketing/ascii-fire";
import { IncidentTicker } from "@/components/marketing/ticker";
import { ProblemSection } from "@/components/marketing/problem-section";
import { LoopSection } from "@/components/marketing/loop-section";
import { EvidenceSection } from "@/components/marketing/evidence-section";
import { McpSection } from "@/components/marketing/mcp-section";
import { SecuritySection } from "@/components/marketing/security-section";
import { FaqSection } from "@/components/marketing/faq-section";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. Sticky Navigation Bar
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <LogoMark className="w-6 h-6 transition-transform group-hover:scale-105" />
              <span className="font-display font-bold text-lg tracking-tight lowercase">firebreak</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-[var(--fg-muted)]">
              <a href="#problem" className="hover:text-[var(--fg)] transition-colors">
                [01] Problem
              </a>
              <a href="#loop" className="hover:text-[var(--fg)] transition-colors">
                [02] How It Works
              </a>
              <a href="#evidence" className="hover:text-[var(--fg)] transition-colors">
                [03] Evidence
              </a>
              <a href="#mcp" className="hover:text-[var(--fg)] transition-colors">
                [04] MCP Tools
              </a>
              <a href="#security" className="hover:text-[var(--fg)] transition-colors">
                [05] Security
              </a>
              <a href="#faq" className="hover:text-[var(--fg)] transition-colors">
                [06] FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/app"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              Open Console
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. Hero Section [00] INCIDENT RESPONSE
      ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col justify-between pt-12 pb-16 overflow-hidden border-b border-[var(--line)]">
        {/* Hairline Grid Texture Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        {/* ASCII Fire in background */}
        <div className="absolute inset-x-0 bottom-0 h-[48%] opacity-35 pointer-events-auto">
          <AsciiFire className="w-full h-full" intensity={0.55} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 space-y-8 my-auto">
          {/* Monospace Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--line)] bg-[var(--surface)]/80 text-[11px] font-mono text-[var(--accent)] shadow-sm backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--ember)] animate-pulse" />
            <span>[ FOR TEAMS SHIPPING ON VERCEL + GITHUB ]</span>
          </div>

          {/* Headlines */}
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.05] text-[var(--fg)]">
              Stop the spread.
            </h1>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight leading-[1.05] text-[var(--fg-muted)]">
              Roll back with proof.
            </h2>
            <p className="text-base sm:text-xl text-[var(--fg-muted)] max-w-2xl pt-2 leading-relaxed font-sans">
              Firebreak finds the deploy that broke production, rolls it back when you approve, and proves it recovered with live health probes.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/app"
              className="px-6 py-3 rounded-xl font-bold font-mono text-sm bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--accent-solid)]/20 flex items-center gap-2"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#loop"
              className="px-6 py-3 rounded-xl font-mono text-sm border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--bg-raised)] active:scale-95 transition-all flex items-center gap-2"
            >
              <span>See the loop ↓</span>
            </a>
          </div>

          {/* Real-time Incident Ticker */}
          <div className="max-w-2xl pt-4">
            <IncidentTicker />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. Section 01: The Problem
      ───────────────────────────────────────────────────────────── */}
      <ProblemSection />

      {/* ─────────────────────────────────────────────────────────────
          4. Section 02: How It Works (The Incident Loop)
      ───────────────────────────────────────────────────────────── */}
      <LoopSection />

      {/* ─────────────────────────────────────────────────────────────
          5. Section 03: Receipts & Evidence
      ───────────────────────────────────────────────────────────── */}
      <EvidenceSection />

      {/* ─────────────────────────────────────────────────────────────
          6. Section 04: MCP Tools
      ───────────────────────────────────────────────────────────── */}
      <McpSection />

      {/* ─────────────────────────────────────────────────────────────
          7. Section 05: Security & Safety
      ───────────────────────────────────────────────────────────── */}
      <SecuritySection />

      {/* ─────────────────────────────────────────────────────────────
          8. Section 06: FAQ
      ───────────────────────────────────────────────────────────── */}
      <FaqSection />

      {/* ─────────────────────────────────────────────────────────────
          9. Final CTA
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-[var(--line)] bg-[var(--bg)] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 z-10">
          <div className="font-mono text-xs text-[var(--accent)] tracking-wider">[ READY FOR PRODUCTION ]</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-[var(--fg)]">
            Ship on Friday.
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[var(--fg-muted)]">
            Sleep on Saturday.
          </h3>
          <p className="text-[var(--fg-muted)] max-w-xl mx-auto text-base sm:text-lg">
            Stop guessing during outages. Connect your GitHub repository and Vercel project in sixty seconds.
          </p>
          <div className="pt-4 flex justify-center">
            <Link
              href="/app"
              className="px-8 py-3.5 rounded-xl font-bold font-mono text-sm bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--accent-solid)]/20 flex items-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. Global Footer
      ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--line)] bg-[var(--bg-raised)] py-12 text-xs font-mono text-[var(--fg-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LogoMark className="w-5 h-5" />
              <span className="font-display font-bold text-base text-[var(--fg)] lowercase">firebreak</span>
            </div>
            <p className="text-[var(--fg-muted)] text-xs font-sans">
              Autonomous diagnosis and human-in-the-loop rollback verification for web teams.
            </p>
            <div className="flex items-center gap-2 text-[var(--ok)] text-[11px] pt-1">
              <span className="w-2 h-2 rounded-full bg-[var(--ok)] animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[var(--fg)] mb-3 uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#loop" className="hover:text-[var(--fg)] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#evidence" className="hover:text-[var(--fg)] transition-colors">
                  Deterministic Evidence
                </a>
              </li>
              <li>
                <a href="#mcp" className="hover:text-[var(--fg)] transition-colors">
                  NitroStack MCP
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[var(--fg)] transition-colors">
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[var(--fg)] mb-3 uppercase tracking-wider text-[11px]">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/app" className="hover:text-[var(--fg)] transition-colors">
                  Operator Console
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[var(--fg)] transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/SHAIK-RAIYAN/firebreak"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--fg)] transition-colors flex items-center gap-1"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[var(--fg)] mb-3 uppercase tracking-wider text-[11px]">Stack</h4>
            <p className="text-[var(--fg-muted)] text-[11px] leading-relaxed mb-4">
              Built with Next.js 16, NitroStack MCP, Inngest durable workflows, and Neon Serverless Postgres.
            </p>
            <p className="text-[10px] text-[var(--fg-subtle)]">© 2026 Firebreak. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
