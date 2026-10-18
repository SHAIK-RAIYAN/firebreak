"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";

type SimpleUser = {
  name?: string | null;
  image?: string | null;
  email?: string | null;
};

export function NavAuthSlot({
  initialUser,
}: {
  initialUser?: SimpleUser | null;
}) {
  const { data: session, isPending } = useSession();

  const user = session?.user ?? initialUser;

  if (user) {
    const displayName = user.name || user.email || "Operator";
    return (
      <Link
        href="/app/settings/account"
        className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[var(--accent)] transition-all shrink-0 group focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        title={`Signed in as ${displayName} · View Account`}
        aria-label={`Signed in as ${displayName} · View Account`}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={32}
            height={32}
            unoptimized
            className="w-7 h-7 rounded-full border border-[var(--line)] group-hover:border-[var(--accent)] object-cover shrink-0 transition-colors shadow-xs"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--accent)] flex items-center justify-center font-mono text-xs font-bold text-[var(--accent)] shrink-0 transition-colors shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
    );
  }

  if (isPending && !initialUser) {
    return (
      <div className="hidden sm:inline-block w-14 h-7 rounded-lg bg-[var(--surface)]/50 animate-pulse border border-[var(--line)] shrink-0" />
    );
  }

  return (
    <Link
      href="/login"
      className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors whitespace-nowrap shrink-0"
    >
      Sign In
    </Link>
  );
}
