import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Terminal, BookOpen, Layers } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DocsSidebar } from "./components/docs-sidebar";

export const metadata: Metadata = {
  title: "Documentation · Firebreak",
  description:
    "Official developer guides, architecture documentation, MCP tool references, and operational manuals for Firebreak.",
  alternates: { canonical: "/docs" },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-(--bg) text-(--fg) selection:bg-(--accent) selection:text-white">
      {/* Global Docs Header */}
      <header className="sticky top-0 z-50 w-full border-b border-(--line) bg-(--bg)/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <LogoMark className="w-6 h-6 transition-transform group-hover:scale-105" />
              <span className="font-display font-bold text-lg tracking-tight lowercase">
                firebreak
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-(--line-strong)">/</span>
              <Link
                href="/docs"
                className="font-mono text-xs font-semibold text-(--accent) hover:underline"
              >
                docs
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/docs/quickstart"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface) transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-(--accent)" />
              <span>Quickstart</span>
            </Link>

            <Link
              href="/docs/tools"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface) transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-(--accent)" />
              <span>MCP Tools</span>
            </Link>

            <ThemeToggle />

            <Link
              href="/app"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-(--accent-solid) text-(--accent-fg) hover:brightness-110 active:scale-95 transition-all shadow-xs flex items-center gap-1"
            >
              <span>Console</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col lg:flex-row">
        <DocsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Docs Footer */}
      <footer className="border-t border-(--line) bg-(--bg-raised) py-6 text-center text-xs font-mono text-(--fg-subtle)">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Firebreak Open-Source Autonomous Incident Mitigation</span>
          <span>Designed with NitroStack MCP · MIT License</span>
        </div>
      </footer>
    </div>
  );
}
