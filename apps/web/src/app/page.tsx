import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { getSession } from "@/lib/session";
import { NavAuthSlot } from "@/components/marketing/nav-auth-slot";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { LoopSection } from "@/components/marketing/loop-section";
import { EvidenceSection } from "@/components/marketing/evidence-section";
import { McpSection } from "@/components/marketing/mcp-section";
import { SecuritySection } from "@/components/marketing/security-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";

export default async function HomePage() {
  const sessionCtx = await getSession().catch(() => null);
  const user = sessionCtx?.user
    ? {
        name: sessionCtx.user.name,
        image: sessionCtx.user.image,
        email: sessionCtx.user.email,
      }
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://firebreak.dev";

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Firebreak",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
  };

  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Firebreak",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Autonomous diagnosis and verified rollback platform for teams shipping on Vercel and GitHub.",
    url: siteUrl,
  };

  const faqPageLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does Firebreak change production on its own?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Every rollback requires explicit human approval, and Firebreak validates live production for drift milliseconds before executing the alias mutation.",
        },
      },
      {
        "@type": "Question",
        name: "What does Firebreak need access to?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A GitHub App with read access to the repositories you select, and a Vercel token with deployment alias permissions. Nothing else.",
        },
      },
      {
        "@type": "Question",
        name: "How does it rank the bad commit without guessing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Firebreak runs a deterministic scoring engine: files and functions in the stack trace, lines in diff hunks, risky file patterns (e.g. migration, pricing, auth), and recency. Identical inputs always yield the exact same ranking.",
        },
      },
      {
        "@type": "Question",
        name: "What is AI used for in Firebreak?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AI is strictly used as an advisory explainer to summarize the diff and suggest potential code patches for the human operator. AI never decides or executes rollbacks.",
        },
      },
      {
        "@type": "Question",
        name: "Which AI providers are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can bring your own API key for Anthropic (Claude 3.5 Sonnet), OpenAI (GPT-4o), Google Gemini (2.5 Flash), or xAI (Grok), or use the platform default.",
        },
      },
      {
        "@type": "Question",
        name: "What is MCP?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Model Context Protocol (MCP) is an open standard that allows coding assistants like Claude Code and Cursor to use secure tools. Firebreak provides a dedicated NitroStack MCP server with 9 standardized tools.",
        },
      },
    ],
  };

  return (
    <SmoothScroll>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-screen flex flex-col bg-(--bg) text-(--fg) selection:bg-(--accent) selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. Sticky Navigation Bar
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-(--line) bg-(--bg)/85 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-10 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <LogoMark className="w-6 h-6 transition-transform group-hover:scale-105" />
              <span className="font-display font-bold text-lg tracking-tight lowercase text-(--fg)">firebreak</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-left">
              <a href="#problem" className="flex flex-col items-start leading-none group py-1 transition-colors">
                <span className="font-mono text-[10px] text-(--accent) tracking-wider mb-1 font-semibold group-hover:brightness-110">[01]</span>
                <span className="font-mono text-xs text-(--fg-muted) group-hover:text-(--fg) transition-colors">Problem</span>
              </a>
              <a href="#loop" className="flex flex-col items-start leading-none group py-1 transition-colors">
                <span className="font-mono text-[10px] text-(--accent) tracking-wider mb-1 font-semibold group-hover:brightness-110">[02]</span>
                <span className="font-mono text-xs text-(--fg-muted) group-hover:text-(--fg) transition-colors">The Loop</span>
              </a>
              <a href="#evidence" className="flex flex-col items-start leading-none group py-1 transition-colors">
                <span className="font-mono text-[10px] text-(--accent) tracking-wider mb-1 font-semibold group-hover:brightness-110">[03]</span>
                <span className="font-mono text-xs text-(--fg-muted) group-hover:text-(--fg) transition-colors">Evidence</span>
              </a>
              <a href="#mcp" className="flex flex-col items-start leading-none group py-1 transition-colors">
                <span className="font-mono text-[10px] text-(--accent) tracking-wider mb-1 font-semibold group-hover:brightness-110">[04]</span>
                <span className="font-mono text-xs text-(--fg-muted) group-hover:text-(--fg) transition-colors">MCP Tools</span>
              </a>
              <a href="#security" className="flex flex-col items-start leading-none group py-1 transition-colors">
                <span className="font-mono text-[10px] text-(--accent) tracking-wider mb-1 font-semibold group-hover:brightness-110">[05]</span>
                <span className="font-mono text-xs text-(--fg-muted) group-hover:text-(--fg) transition-colors">Security</span>
              </a>
              <a href="#faq" className="flex flex-col items-start leading-none group py-1 transition-colors">
                <span className="font-mono text-[10px] text-(--accent) tracking-wider mb-1 font-semibold group-hover:brightness-110">[06]</span>
                <span className="font-mono text-xs text-(--fg-muted) group-hover:text-(--fg) transition-colors">FAQ</span>
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <NavAuthSlot initialUser={user} />
            <Link
              href="/app"
              className="px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-semibold bg-(--accent-solid) text-(--accent-fg) hover:brightness-110 active:scale-95 transition-all shadow-sm whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">Open Console</span>
              <span className="sm:hidden">Console</span>
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
      <SiteFooter />
    </div>
    </SmoothScroll>
  );
}
