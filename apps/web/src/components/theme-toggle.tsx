"use client";

import { MoonIcon, type MoonIconHandle } from "@/components/ui/moon";
import { SunIcon, type SunIconHandle } from "@/components/ui/sun";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const sunRef = useRef<SunIconHandle>(null);
  const moonRef = useRef<MoonIconHandle>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="w-8 h-8 rounded-lg border border-(--line) bg-(--surface) opacity-40 shrink-0"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    if (isDark) {
      sunRef.current?.startAnimation();
      setTheme("light");
    } else {
      moonRef.current?.startAnimation();
      setTheme("dark");
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseEnter={() => {
        if (isDark) sunRef.current?.startAnimation();
        else moonRef.current?.startAnimation();
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-(--line) bg-(--surface) hover:bg-(--line) text-(--fg) hover:text-(--accent) transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-(--accent)"
    >
      {isDark ? (
        <SunIcon
          ref={sunRef}
          size={16}
          className="text-neutral-300 hover:text-neutral-50 transition-colors"
        />
      ) : (
        <MoonIcon
          ref={moonRef}
          size={16}
          className="text-indigo-600 dark:text-indigo-400 transition-colors"
        />
      )}
    </button>
  );
}
