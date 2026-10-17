import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white">
      {/* Top minimal bar */}
      <header className="border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="w-6 h-6" />
            <span className="font-display font-bold text-lg tracking-tight lowercase">firebreak</span>
          </Link>
          <Link
            href="/app"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--bg-raised)] text-[var(--fg)] border border-[var(--line)] transition-colors"
          >
            Console
          </Link>
        </div>
      </header>

      {/* Main 404 container */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Hairline Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-md w-full text-center space-y-6 z-10 p-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/90 shadow-2xl backdrop-blur-sm">
          <div className="font-mono text-xs text-[var(--ember)] tracking-widest uppercase">
            [ 404 · INCIDENT EXCEPTION ]
          </div>

          <div className="space-y-2">
            <h1 className="text-6xl font-black font-display tracking-tight text-[var(--fg)]">
              404
            </h1>
            <h2 className="text-xl font-bold font-display text-[var(--fg)]">
              Target Not Located
            </h2>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              The route or deployment you requested has been evacuated or does not exist in this workspace.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-semibold bg-[var(--surface)] text-[var(--fg)] border border-[var(--line-strong)] hover:bg-[var(--bg-raised)] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/app"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Open Console</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-[var(--line)] py-6 text-center text-[11px] font-mono text-[var(--fg-subtle)]">
        Firebreak Incident Isolation System
      </footer>
    </div>
  );
}
