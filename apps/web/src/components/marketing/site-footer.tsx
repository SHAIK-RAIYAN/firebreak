import Link from "next/link";
import { ExternalLink, Heart } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { VisitorCounter } from "@/components/marketing/visitor-counter";

export function SiteFooter() {
  return (
    <footer className="border-t border-(--line) bg-(--bg-raised) py-12 text-xs font-mono text-(--fg-subtle)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LogoMark className="w-5 h-5" />
              <span className="font-display font-bold text-base text-(--fg) lowercase">
                firebreak
              </span>
            </div>
            <p className="text-(--fg-muted) text-xs font-sans leading-relaxed">
              Autonomous diagnosis and human-in-the-loop rollback verification for web teams.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-(--fg) mb-3 uppercase tracking-wider text-[11px]">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#loop" className="hover:text-(--fg) transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#evidence" className="hover:text-(--fg) transition-colors">
                  Deterministic Evidence
                </a>
              </li>
              <li>
                <a href="#mcp" className="hover:text-(--fg) transition-colors">
                  NitroStack MCP
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-(--fg) transition-colors">
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-(--fg) mb-3 uppercase tracking-wider text-[11px]">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/app" className="hover:text-(--fg) transition-colors">
                  Operator Console
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-(--fg) transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/SHAIK-RAIYAN/firebreak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-(--fg) transition-colors flex items-center gap-1"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-(--fg) mb-3 uppercase tracking-wider text-[11px]">
              Stack
            </h4>
            <p className="text-(--fg-muted) text-[11px] leading-relaxed mb-4">
              Built with Next.js 16, NitroStack MCP, Inngest durable workflows, and Neon Serverless Postgres.
            </p>
          </div>
        </div>

        {/* Attribution & Live Visitor Counter Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-(--line) flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p className="text-(--fg-subtle) text-center sm:text-left">
            © 2026 Firebreak. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1.5 text-(--fg-muted)">
            <span className="inline-flex items-center gap-1.5">
              <span>Built with</span>
              <Heart
                className="w-3.5 h-3.5 text-(--accent) fill-(--accent) transition-transform duration-200 hover:scale-125"
                aria-hidden="true"
              />
              <span>by</span>
              <a
                href="https://shaikraiyan.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-(--fg) underline-offset-4 hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-(--accent) rounded-xs"
              >
                Shaik Raiyan
              </a>
            </span>

            <span className="text-(--line-strong) select-none" aria-hidden="true">
              •
            </span>

            <VisitorCounter />
          </div>
        </div>
      </div>
    </footer>
  );
}
