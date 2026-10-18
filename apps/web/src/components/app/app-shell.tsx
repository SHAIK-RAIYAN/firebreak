"use client";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import {
  ChevronRight,
  Cpu,
  Flame,
  Key,
  Layers,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  ShieldAlert,
  Sliders,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPalette } from "./command-palette";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
};

export function AppShell({
  children,
  workspaceName = "Personal Workspace",
  userName = "Operator",
  userEmail = "",
  userAvatar = "",
  activeIncidentsCount = 0,
}: {
  children: React.ReactNode;
  workspaceName?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  activeIncidentsCount?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Close sign out modal on Escape key
  useEffect(() => {
    if (!showSignOutModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !signingOut) {
        setShowSignOutModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSignOutModal, signingOut]);

  const navItems: NavItem[] = [
    { href: "/app", label: "Overview", icon: Flame },
    {
      href: "/app/incidents",
      label: "Incidents",
      icon: ShieldAlert,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
    },
    { href: "/app/services", label: "Services", icon: Layers },
    { href: "/app/integrations", label: "Integrations", icon: Sliders },
    { href: "/app/settings/ai", label: "AI Keys", icon: Cpu },
    { href: "/app/settings/mcp", label: "MCP", icon: Key },
    { href: "/app/settings/account", label: "Account", icon: User },
  ];

  // Match active item accurately, supporting nested routes and dynamic IDs
  const isItemActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Compute breadcrumbs from pathname with sensible labels and fallback URLs
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbItems = pathParts.map((part, index) => {
    let url = "/" + pathParts.slice(0, index + 1).join("/");
    let label = part;
    if (part === "app") {
      label = "Console";
      url = "/app";
    } else if (part === "incidents") {
      label = "Incidents";
    } else if (part === "services") {
      label = "Services";
    } else if (part === "integrations") {
      label = "Integrations";
    } else if (part === "settings") {
      label = "Settings";
      url = "/app/settings/ai";
    } else if (part === "ai") {
      label = "AI Keys";
    } else if (part === "mcp") {
      label = "MCP Client";
    } else if (part === "account") {
      label = "Account";
    } else if (part === "new") {
      label = "New Service";
    } else if (part.startsWith("inc_") || part.startsWith("INC-")) {
      label = part.length > 16 ? `${part.slice(0, 14)}…` : part;
    } else if (part.startsWith("srv_")) {
      label = part.length > 16 ? `${part.slice(0, 14)}…` : part;
    }
    return { url, label };
  });

  const handleConfirmSignOut = async () => {
    try {
      setSigningOut(true);
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
        },
      });
      // Fallback in case onSuccess isn't called
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-fg">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-bg-raised transition-all duration-300 ease-in-out lg:static ${collapsed ? "lg:w-16" : "lg:w-60"
          } ${mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-line px-3.5">
          <Logo collapsed={collapsed} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden p-1.5 rounded hover:bg-(--surface) text-(--fg-muted) hover:text-(--fg) lg:inline-flex"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded hover:bg-(--surface) text-(--fg-muted) lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation items with shared layout transition for active pill and purple indicator */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center gap-3 rounded-lg py-2 text-xs font-medium transition-colors group focus-visible:outline-2 focus-visible:outline-(--accent) ${collapsed ? "justify-center px-2" : "px-3"
                  } ${isActive
                    ? "text-(--fg) font-semibold"
                    : "text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface)/40"
                  }`}
                title={collapsed ? item.label : undefined}
              >
                {/* Gliding Active Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-(--surface) border border-(--line) shadow-xs"
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 36 }
                    }
                  />
                )}

                {/* Gliding Left Purple Indicator Bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-(--accent) z-10"
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 36 }
                    }
                  />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors relative z-10 ${isActive
                      ? "text-(--accent)"
                      : "text-(--fg-muted) group-hover:text-(--fg)"
                    }`}
                />
                {!collapsed && (
                  <span className="flex-1 truncate relative z-10">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 relative z-10">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Workspace & User area */}
        <div className="border-t border-(--line) p-2.5 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1.5 rounded-md bg-(--surface) border border-(--line) flex items-center justify-between">
              <div className="truncate">
                <div className="text-[10px] font-mono uppercase text-(--fg-subtle)">
                  Workspace
                </div>
                <div className="text-xs font-semibold text-(--fg) truncate">
                  {workspaceName}
                </div>
              </div>
            </div>
          )}

          <div
            className={`flex items-center justify-between ${collapsed ? "flex-col gap-2" : "gap-2"
              }`}
          >
            <div className="flex items-center gap-2 truncate" title={userEmail || userName}>
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={28}
                  height={28}
                  unoptimized
                  className="w-7 h-7 rounded-full border border-(--line) shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-(--surface) border border-(--line) flex items-center justify-center font-mono text-xs font-bold text-(--accent) shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-medium text-(--fg) truncate">
                    {userName}
                  </div>
                  {userEmail && (
                    <div className="text-[10px] text-(--fg-subtle) truncate font-mono">
                      {userEmail}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setShowSignOutModal(true)}
                className="p-1.5 rounded-md border border-(--line) bg-(--surface) hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900/40 text-(--fg-muted) transition cursor-pointer"
                title="Sign out"
                aria-haspopup="dialog"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Top Bar */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Bar (56px) */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-(--line) bg-(--bg-raised) px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg border border-(--line) text-(--fg-muted) lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb with subtle transition in fixed-height header */}
            <div className="hidden sm:flex items-center h-6 overflow-hidden font-mono text-xs text-(--fg-muted)">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.nav
                  key={pathname}
                  aria-label="Breadcrumbs"
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, x: 4 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {breadcrumbItems.map((item, idx) => {
                    const isLast = idx === breadcrumbItems.length - 1;
                    return (
                      <div key={`bc-${item.url}-${idx}`} className="flex items-center gap-1.5 shrink-0">
                        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-(--fg-subtle) shrink-0" />}
                        {isLast ? (
                          <span className="font-semibold text-(--fg) shrink-0" aria-current="page">
                            {item.label}
                          </span>
                        ) : (
                          <Link
                            href={item.url}
                            className="hover:text-(--accent) transition-colors shrink-0"
                          >
                            {item.label}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </motion.nav>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Incident Warning Badge */}
            {activeIncidentsCount > 0 && (
              <Link
                href="/app/incidents"
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 font-mono text-xs text-rose-400 hover:brightness-110 transition animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <span className="font-bold">
                  {activeIncidentsCount} active incident{activeIncidentsCount > 1 ? "s" : ""}
                </span>
              </Link>
            )}

            {/* ⌘K Command Palette */}
            <CommandPalette />
          </div>
        </header>

        {/* Main Content Body with coordinated route transition */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.16,
                  ease: [0.16, 1, 0.3, 1], // Firebreak --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
                }}
                className="w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Sign Out Confirmation Modal */}
      <AnimatePresence>
        {showSignOutModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-dialog-title"
            aria-describedby="signout-dialog-desc"
            onClick={(e) => {
              if (e.target === e.currentTarget && !signingOut) {
                setShowSignOutModal(false);
              }
            }}
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-xl border border-(--line) bg-(--bg-raised) p-6 shadow-2xl space-y-5"
            >
              {/* Header with Icon and Close Button */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-900/40 bg-rose-950/20 text-rose-400">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 id="signout-dialog-title" className="text-base font-bold text-(--fg)">
                      Confirm Sign Out
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSignOutModal(false)}
                  disabled={signingOut}
                  className="rounded-lg p-1 text-(--fg-muted) hover:bg-(--surface) hover:text-(--fg) transition disabled:opacity-50 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Description */}
              <p id="signout-dialog-desc" className="text-sm text-(--fg-muted) leading-relaxed">
                Are you sure you want to sign out of Firebreak?
              </p>

              {/* Operator details box */}
              <div className="flex items-center gap-3 rounded-lg border border-(--line) bg-(--surface)/60 p-3">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full border border-(--line) shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-(--line) bg-(--surface) font-mono text-xs font-bold text-(--accent)">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 truncate">
                  <div className="text-xs font-semibold text-(--fg) truncate">
                    {userName}
                  </div>
                  {userEmail && (
                    <div className="text-[11px] font-mono text-(--fg-subtle) truncate">
                      {userEmail}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignOutModal(false)}
                  disabled={signingOut}
                  className="rounded-lg border border-(--line) bg-(--surface) px-4 py-2 text-xs font-medium text-(--fg) hover:bg-(--surface-hover) transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignOut}
                  disabled={signingOut}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  {signingOut ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
