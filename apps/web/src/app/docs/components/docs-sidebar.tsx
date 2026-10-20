"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_CATEGORIES } from "../docs-data";
import { BookOpen, ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getHref = (slug: string) => {
    return slug === "overview" ? "/docs" : `/docs/${slug}`;
  };

  const isActive = (slug: string) => {
    const target = getHref(slug);
    if (slug === "overview") {
      return pathname === "/docs" || pathname === "/docs/overview";
    }
    return pathname === target;
  };

  const navContent = (
    <nav className="space-y-6 text-sm">
      {DOC_CATEGORIES.map((cat) => (
        <div key={cat.name} className="space-y-2">
          <h3 className="px-3 font-mono text-[11px] font-semibold text-(--fg-subtle) uppercase tracking-wider">
            {cat.name}
          </h3>
          <ul className="space-y-1">
            {cat.items.map((item) => {
              const active = isActive(item.slug);
              return (
                <li key={item.slug}>
                  <Link
                    href={getHref(item.slug)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                      active
                        ? "bg-(--surface) text-(--fg) font-semibold shadow-2xs border-l-2 border-(--accent)"
                        : "text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface)/50"
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-(--bg-raised) text-(--accent) border border-(--line)">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden sticky top-16 z-40 w-full border-b border-(--line) bg-(--bg)/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 text-xs font-mono text-(--fg) px-2.5 py-1.5 rounded-md border border-(--line) bg-(--surface)"
        >
          {mobileOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          <span>{mobileOpen ? "Close Menu" : "Documentation Menu"}</span>
        </button>
        <span className="font-mono text-[11px] text-(--fg-subtle)">
          {DOC_CATEGORIES.flatMap((c) => c.items).find((i) => isActive(i.slug))?.title || "Documentation"}
        </span>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-28 z-40 bg-(--bg)/95 backdrop-blur-md p-6 overflow-y-auto border-b border-(--line)">
          {navContent}
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pr-4 py-4 border-r border-(--line)">
        {navContent}
      </aside>
    </>
  );
}
