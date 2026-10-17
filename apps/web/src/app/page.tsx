import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { LoopSection } from "@/components/marketing/loop-section";
import { EvidenceSection } from "@/components/marketing/evidence-section";
import { McpSection } from "@/components/marketing/mcp-section";
import { SecuritySection } from "@/components/marketing/security-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";

export default function HomePage() {
  return (
    <SmoothScroll>
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
      <HeroSection />

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
      <CtaSection />

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
    </SmoothScroll>
  );
}
