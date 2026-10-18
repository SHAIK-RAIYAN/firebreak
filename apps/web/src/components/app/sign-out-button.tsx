"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="px-3 py-1.5 text-xs font-mono font-medium rounded border border-(--line-strong) text-(--fg-muted) hover:text-(--fg) hover:border-(--danger) hover:bg-red-950/10 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
