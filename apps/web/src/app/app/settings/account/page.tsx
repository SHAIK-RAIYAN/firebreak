import Image from "next/image";
import { requireSession } from "@/lib/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/app/sign-out-button";
import { NotificationPreferencesCard } from "@/components/app/notification-preferences-card";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const { user, workspace } = await requireSession("/app/settings/account");

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-(--fg)">
          Account Settings
        </h1>
        <p className="text-sm text-(--fg-muted)">
          Manage your operator identity, workspace details, and session
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-6 space-y-5">
        <div className="flex items-center gap-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "Operator"}
              width={64}
              height={64}
              unoptimized
              className="w-16 h-16 rounded-full border border-(--line)"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-(--surface) border border-(--line) flex items-center justify-center font-mono text-xl font-bold text-(--accent)">
              {(user.name || "O").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-(--fg)">
              {user.name || "Operator"}
            </h2>
            <p className="text-xs font-mono text-(--fg-muted)">
              {user.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-(--line) text-xs font-mono">
          <div className="p-3 rounded-lg bg-(--surface) border border-(--line)">
            <span className="text-(--fg-subtle) block mb-1">User ID</span>
            <span className="text-(--fg) select-all">{user.id}</span>
          </div>

          <div className="p-3 rounded-lg bg-(--surface) border border-(--line)">
            <span className="text-(--fg-subtle) block mb-1">Current Workspace</span>
            <span className="text-(--accent) font-semibold">{workspace.name}</span>
          </div>
        </div>
      </div>

      {/* Preferences Card */}
      <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-6 space-y-4">
        <h2 className="text-base font-bold text-(--fg)">Preferences</h2>
        <div className="flex items-center justify-between py-2 border-b border-(--line)">
          <div>
            <div className="text-sm font-semibold text-(--fg)">
              Color Theme
            </div>
            <p className="text-xs text-(--fg-muted)">
              Switch between Night shift (dark) and Day shift (light)
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Notification Preferences Card */}
      <NotificationPreferencesCard userEmail={user.email} />

      {/* Danger Zone / Session */}
      <div className="rounded-xl border border-rose-900/30 bg-(--bg-raised) p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-rose-400">Session</h2>
          <p className="text-xs text-(--fg-muted)">
            Terminate your active browser session on this workstation
          </p>
        </div>
        <div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
