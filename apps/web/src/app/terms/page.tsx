import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Terms of Service · Firebreak",
  description: "Terms of service and service level expectations for Firebreak incident response system.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-(--bg) text-(--fg) selection:bg-(--accent) selection:text-white">
      {/* Header */}
      <header className="border-b border-(--line) bg-(--bg)/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="w-6 h-6" />
            <span className="font-display font-bold text-lg tracking-tight lowercase">firebreak</span>
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface) transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 flex-1">
        <div className="space-y-3">
          <div className="font-mono text-xs text-(--accent) tracking-wider">[ LEGAL & COMPLIANCE ]</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-(--fg)">
            Terms of Service
          </h1>
          <p className="text-xs font-mono text-(--fg-subtle)">Last updated: October 2026</p>
        </div>

        <div className="space-y-8 text-sm text-(--fg-muted) leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-(--fg)">1. Acceptance of Terms</h2>
            <p>
              By accessing Firebreak, connecting a GitHub App, or registering an MCP client with your workspace token, you agree to these Terms of Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-(--fg)">2. Operational Responsibility & Approval Gates</h2>
            <p>
              Firebreak provides deterministic commit ranking, automated health checking, and deployment staging. You acknowledge that production rollbacks require human authorization, and that your team maintains primary responsibility for approving or rejecting proposed changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-(--fg)">3. Rate Limits & Infrastructure Usage</h2>
            <p>
              Usage of the Firebreak platform and NitroStack MCP server must comply with reasonable operational limits. Excessive automated webhook polling or unauthorized security probing of downstream services is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-(--fg)">4. Limitation of Liability</h2>
            <p>
              Firebreak provides software tools designed to mitigate production downtime. To the maximum extent permitted by applicable law, Firebreak is provided &quot;as is&quot; without warranties of uninterrupted availability.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-(--line) py-8 text-center text-xs font-mono text-(--fg-subtle)">
        © 2026 Firebreak Systems. All rights reserved.
      </footer>
    </div>
  );
}
