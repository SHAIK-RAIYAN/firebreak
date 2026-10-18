"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Flame,
  Layers,
  Sliders,
  Cpu,
  Key,
  User,
  Sun,
  Moon,
  PlusCircle,
  X,
} from "lucide-react";

type CommandItem = {
  id: string;
  title: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const navigate = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  const commands: CommandItem[] = [
    {
      id: "overview",
      title: "Overview",
      section: "Navigation",
      icon: Flame,
      action: () => navigate("/app"),
    },
    {
      id: "incidents",
      title: "Incidents",
      section: "Navigation",
      icon: Flame,
      action: () => navigate("/app/incidents"),
    },
    {
      id: "services",
      title: "Services",
      section: "Navigation",
      icon: Layers,
      action: () => navigate("/app/services"),
    },
    {
      id: "new-service",
      title: "Create new service",
      section: "Actions",
      icon: PlusCircle,
      action: () => navigate("/app/services/new"),
    },
    {
      id: "integrations",
      title: "Integrations (GitHub & Vercel)",
      section: "Settings",
      icon: Sliders,
      action: () => navigate("/app/integrations"),
    },
    {
      id: "ai-settings",
      title: "AI Analysis & Keys",
      section: "Settings",
      icon: Cpu,
      action: () => navigate("/app/settings/ai"),
    },
    {
      id: "mcp-settings",
      title: "NitroStack MCP Keys",
      section: "Settings",
      icon: Key,
      action: () => navigate("/app/settings/mcp"),
    },
    {
      id: "account",
      title: "Account settings",
      section: "Settings",
      icon: User,
      action: () => navigate("/app/settings/account"),
    },
    {
      id: "theme-toggle",
      title: `Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`,
      section: "Appearance",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      action: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        setOpen(false);
      },
    },
  ];

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.section.toLowerCase().includes(query.toLowerCase()),
      )
    : commands;

  const activeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      } else if (open) {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0,
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filtered[activeIndex]) {
            filtered[activeIndex].action();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, toggle, filtered, activeIndex]);

  return (
    <>
      {/* Trigger Button in TopBar */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSelectedIndex(0);
        }}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-(--line) bg-(--surface) text-(--fg-muted) hover:text-(--fg) hover:border-(--line-strong) transition focus-visible:outline-2 focus-visible:outline-(--accent)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search or jump to...</span>
        <span className="inline sm:hidden">Search...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-(--bg) border border-(--line) text-[10px] text-(--fg-subtle) font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-(--bg-raised) border border-(--line) rounded-xl shadow-2xl overflow-hidden font-sans"
            role="dialog"
            aria-modal="true"
          >
            {/* Search Input - explicitly clean without border or ring */}
            <div className="flex items-center px-4 border-b border-(--line)">
              <Search className="w-4 h-4 text-(--fg-muted) shrink-0" />
              <input
                type="text"
                data-command-input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search..."
                autoFocus
                className="w-full px-3 py-3.5 text-sm bg-transparent border-0 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-(--fg) placeholder:text-(--fg-subtle)"
                style={{ outline: "none", boxShadow: "none" }}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-(--surface) text-(--fg-muted)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results list - scrollbar suppressed */}
            <div
              className="max-h-80 overflow-y-auto p-2 space-y-1 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-(--fg-muted)">
                  No commands found matching &quot;{query}&quot;
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition text-left ${
                        isSelected
                          ? "bg-(--surface) text-(--fg) border border-(--line-strong)"
                          : "hover:bg-(--surface)/70 text-(--fg-muted) border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isSelected ? "text-(--accent)" : "text-(--fg-subtle)"
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            isSelected ? "text-(--fg)" : "text-(--fg-muted)"
                          }`}
                        >
                          {cmd.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono uppercase text-(--fg-subtle)">
                        {cmd.section}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-(--line) bg-(--surface)/50 flex items-center justify-between text-[11px] font-mono text-(--fg-muted)">
              <span>Press ESC to close</span>
              <span>Use arrow keys to navigate</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
