"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { authClient, useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/brand/logo";
import { useAsciiFireTransition } from "@/components/transitions/ascii-fire-transition";
import { WelcomeScreen } from "./welcome-screen";

interface LoginViewProps {
  initialUser: {
    name?: string | null;
    email?: string | null;
  } | null;
  isWelcome: boolean;
  nextUrl: string;
  initialError?: string | null;
}

export function LoginView({
  initialUser,
  isWelcome,
  nextUrl,
  initialError,
}: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const welcomeActive = isWelcome || searchParams.get("welcome") === "1";
  const paramName = searchParams.get("name");
  const { triggerEntranceReveal, isTransitioning } = useAsciiFireTransition();
  const hasRevealedRef = useRef(isTransitioning || welcomeActive);

  // On direct visit or cold load to /login, play signature ASCII fire reveal if not already in transition
  useEffect(() => {
    if (!hasRevealedRef.current && !isTransitioning && !welcomeActive) {
      hasRevealedRef.current = true;
      triggerEntranceReveal();
    }
  }, [isTransitioning, triggerEntranceReveal, welcomeActive]);

  // If returning from OAuth callback with ?welcome=1, verify session
  const { data: clientSession, isPending } = useSession();
  const activeUser =
    initialUser ||
    clientSession?.user ||
    (welcomeActive && paramName ? { name: paramName, email: null } : null);

  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Route through /login?welcome=1 to trigger the personalized welcome sequence
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const callbackURL = `${origin}/login?welcome=1${
        nextUrl && nextUrl !== "/app" ? `&next=${encodeURIComponent(nextUrl)}` : ""
      }`;

      await authClient.signIn.social({
        provider: "github",
        callbackURL,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with GitHub",
      );
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-(--bg) text-(--fg)">
      {/* ─────────────────────────────────────────────────────────────
          Left Half — Freedom Tree (Editorial, Immersive)
          Desktop: 50% split-screen full height
          Mobile: Compact visual header
      ───────────────────────────────────────────────────────────── */}
      <section
        className="relative w-full lg:w-1/2 h-56 sm:h-72 lg:h-screen shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-(--line) bg-(--bg-raised)"
        aria-label="Freedom tree visual"
      >
        <Image
          src="/images/freedom-tree.png"
          alt="Firebreak freedom tree"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center filter saturate-[0.92] contrast-[1.04] transition-transform duration-700 hover:scale-[1.01]"
        />

        {/* Subtle Edge Vignette */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_40%,rgba(0,0,0,0.35)_100%] pointer-events-none" />

        {/* Quiet Editorial Caption in corner */}
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-(--bg)/80 backdrop-blur-md border border-(--line) text-[11px] font-mono tracking-wider text-(--fg-subtle) uppercase select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-(--ok)" />
          <span>Freedom Tree · Stop the spread</span>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Right Half — Sign-in (Minimal, Precise, Light)
      ───────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 min-h-[calc(100vh-14rem)] lg:min-h-screen">
        {/* Top Header Row with Theme Toggle */}
        <header className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="flex items-center gap-2.5 select-none group focus-visible:outline-2 focus-visible:outline-(--accent) rounded"
            title="Firebreak — Return to Home"
            aria-label="Firebreak — Return to Home"
          >
            <LogoMark className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
            <span className="font-display font-bold tracking-tight text-base text-(--fg) lowercase">
              firebreak
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Center Panel (Sign-in Form or Personalized Welcome) */}
        <div className="max-w-[380px] w-full mx-auto my-auto py-8 sm:py-12 flex flex-col justify-center min-h-[340px]">
          <AnimatePresence mode="wait">
            {welcomeActive && activeUser ? (
              <motion.div
                key="welcome-panel"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full"
              >
                <WelcomeScreen user={activeUser} nextUrl={nextUrl} />
              </motion.div>
            ) : welcomeActive && isPending ? (
              <motion.div
                key="verifying-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center py-12"
              >
                <div className="inline-flex items-center gap-2 text-xs font-mono text-(--fg-muted)">
                  <span className="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse" />
                  <span>Verifying session...</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signin-form"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Heading & Descriptor */}
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--fg)">
                    Sign in to console
                  </h1>
                  <p className="text-sm text-(--fg-muted) leading-relaxed">
                    Access your incident mitigation workspace and automated rollback safeguards.
                  </p>
                </div>

                {/* Error Message Alert */}
                {error && (
                  <div
                    className="rounded-lg border border-(--danger)/40 bg-red-950/20 px-3.5 py-2.5 text-xs text-(--danger)"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* GitHub Sign-In Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGitHubLogin}
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-3 rounded-lg bg-(--accent-solid) px-4 py-3 font-medium text-(--accent-fg) shadow-sm transition-all duration-150 hover:opacity-95 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    aria-label="Continue with GitHub"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Connecting to GitHub...</span>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="h-5 w-5 fill-current shrink-0 transition-transform group-hover:scale-105"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          />
                        </svg>
                        <span className="text-sm font-semibold tracking-tight">
                          Continue with GitHub
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quiet Terms Footnote */}
                <p className="text-[11px] font-mono text-(--fg-subtle) leading-relaxed pt-2">
                  Sign-in provides operator access. Production rollbacks always require verified authorization and are recorded in the append-only timeline.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Status / Footer */}
        <footer className="w-full pt-6 border-t border-(--line) flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-(--fg-subtle)">
          <span>Deterministic rollback engine</span>
          <span className="text-(--fg-muted)">5-second trace · Proof of recovery</span>
        </footer>
      </section>
    </main>
  );
}
