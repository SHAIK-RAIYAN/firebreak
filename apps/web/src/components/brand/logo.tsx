import Link from "next/link";

export function LogoMark({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Firebreak logo"
    >
      {/* 5-column flame */}
      <rect x="2" y="16" width="3" height="12" rx="0.5" fill="#7C3AED" />
      <rect x="6" y="10" width="3" height="18" rx="0.5" fill="#A855F7" />
      <rect x="10" y="4" width="3" height="24" rx="0.5" fill="#C026D3" />
      <rect x="14" y="8" width="3" height="20" rx="0.5" fill="#E879F9" />
      <rect x="18" y="14" width="3" height="14" rx="0.5" fill="#F0ABFC" />
      {/* Column 22 is empty: the deliberate firebreak gap */}
      {/* 2 columns of dim uncrossed embers */}
      <rect x="26" y="22" width="2.5" height="6" rx="0.5" fill="#4C1D95" opacity="0.6" />
      <rect x="29.5" y="24" width="2.5" height="4" rx="0.5" fill="#3B0F6B" opacity="0.4" />
    </svg>
  );
}

export function Logo({
  collapsed = false,
  href = "/",
}: {
  collapsed?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded p-1"
      title="Firebreak"
    >
      <LogoMark className="w-6 h-6 shrink-0 transition-transform group-hover:scale-105" />
      {!collapsed && (
        <span className="font-display font-bold tracking-tight text-lg text-[var(--fg)] lowercase select-none">
          firebreak
        </span>
      )}
    </Link>
  );
}
