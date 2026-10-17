import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Privacy Policy · Firebreak",
  description: "Firebreak privacy policy: encryption standards, credential isolation, and data governance.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white">
      {/* Header */}
      <header className="border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="w-6 h-6" />
            <span className="font-display font-bold text-lg tracking-tight lowercase">firebreak</span>
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 flex-1">
        <div className="space-y-3">
          <div className="font-mono text-xs text-[var(--accent)] tracking-wider">[ LEGAL & COMPLIANCE ]</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[var(--fg)]">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-[var(--fg-subtle)]">Last updated: October 2026</p>
        </div>

        <div className="space-y-8 text-sm text-[var(--fg-muted)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--fg)]">1. Data Architecture & Isolation</h2>
            <p>
              Firebreak is engineered with zero-trust architectural isolation. Workspace tenancy is isolated at the database query layer, ensuring that no incident telemetry, repository metadata, or configuration is accessible across different organizational boundaries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--fg)]">2. Encryption of Third-Party Credentials</h2>
            <p>
              GitHub installation tokens, Vercel API credentials, and user-provided AI provider API keys are encrypted at rest using AES-256-GCM. Cryptographic operations bind workspace-specific Additional Authenticated Data (AAD) into every ciphertext payload, preventing ciphertext transplant attacks across accounts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--fg)]">3. AI Provider Usage & Data Sharing</h2>
            <p>
              When an AI analysis is requested for a suspect commit diff, code snippets are transmitted strictly to the LLM provider configured by the workspace administrator (e.g., Anthropic, OpenAI, Google Gemini, or xAI). We do not train proprietary models on your private source code.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--fg)]">4. Audit Logs & Data Retention</h2>
            <p>
              Incident events, webhook delivery receipts, and verification probe streak metrics are retained for auditability and compliance reporting. You may request cryptographic deletion or workspace evacuation at any time.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] py-8 text-center text-xs font-mono text-[var(--fg-subtle)]">
        © 2026 Firebreak Systems. All rights reserved.
      </footer>
    </div>
  );
}
