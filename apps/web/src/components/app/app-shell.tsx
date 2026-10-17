"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame,
  Layers,
  Sliders,
  Cpu,
  Key,
  User,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const pathname = usePathname();
  const router = useRouter();

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

  // Compute breadcrumbs from pathname
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbItems = pathParts.map((part, index) => {
    const url = "/" + pathParts.slice(0, index + 1).join("/");
    let label = part;
    if (part === "app") label = "Console";
    else if (part === "incidents") label = "Incidents";
    else if (part === "services") label = "Services";
    else if (part === "integrations") label = "Integrations";
    else if (part === "settings") label = "Settings";
    else if (part.startsWith("inc_") || part.startsWith("INC-")) label = part;
    return { url, label };
  });

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error(err);
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--line)] bg-[var(--bg-raised)] transition-all duration-300 ease-in-out lg:static ${
          collapsed ? "lg:w-16" : "lg:w-60"
        } ${mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-3.5">
          <Logo collapsed={collapsed} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden p-1.5 rounded hover:bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] lg:inline-flex"
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
              className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--fg-muted)] lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition group ${
                  isActive
                    ? "bg-[var(--surface)] text-[var(--fg)] font-semibold shadow-xs"
                    : "text-[var(--fg-muted)] hover:bg-[var(--surface)]/60 hover:text-[var(--fg)]"
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[var(--accent)]" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-[var(--fg-muted)] group-hover:text-[var(--fg)]"
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Workspace & User area */}
        <div className="border-t border-[var(--line)] p-2.5 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1.5 rounded-md bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between">
              <div className="truncate">
                <div className="text-[10px] font-mono uppercase text-[var(--fg-subtle)]">
                  Workspace
                </div>
                <div className="text-xs font-semibold text-[var(--fg)] truncate">
                  {workspaceName}
                </div>
              </div>
            </div>
          )}

          <div
            className={`flex items-center justify-between ${
              collapsed ? "flex-col gap-2" : "gap-2"
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
                  className="w-7 h-7 rounded-full border border-[var(--line)] shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center font-mono text-xs font-bold text-[var(--accent)] shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-medium text-[var(--fg)] truncate">
                    {userName}
                  </div>
                  {userEmail && (
                    <div className="text-[10px] text-[var(--fg-subtle)] truncate font-mono">
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
                onClick={handleSignOut}
                className="p-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900/40 text-[var(--fg-muted)] transition"
                title="Sign out"
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg-raised)] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--fg-muted)] lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-[var(--fg-muted)]">
              {breadcrumbItems.map((item, idx) => (
                <div key={item.url} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />}
                  {idx === breadcrumbItems.length - 1 ? (
                    <span className="font-semibold text-[var(--fg)]">
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.url}
                      className="hover:text-[var(--accent)] transition"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
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

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
