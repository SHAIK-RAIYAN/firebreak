"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded border border-[var(--line)] bg-[var(--surface)] opacity-50" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="p-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--fg)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      title={`Current: ${theme} (click to toggle)`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-300" strokeWidth={1.5} />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
      )}
    </button>
  );
}
