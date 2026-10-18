"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, ShieldAlert, CheckCircle2, Clock, Check, Loader2 } from "lucide-react";

interface NotificationPreferences {
  email_enabled: boolean;
  notify_incident_opened: boolean;
  notify_action_proposed: boolean;
  notify_action_resolved: boolean;
}

export function NotificationPreferencesCard({
  userEmail,
}: {
  userEmail: string;
}) {
  const queryClient = useQueryClient();

  const {
    data: prefs = {
      email_enabled: true,
      notify_incident_opened: true,
      notify_action_proposed: true,
      notify_action_resolved: true,
    },
    isLoading: loading,
  } = useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications/preferences");
      if (!res.ok) throw new Error("Failed to load notification preferences");
      const json = await res.json();
      return {
        email_enabled: json.data?.email_enabled ?? true,
        notify_incident_opened: json.data?.notify_incident_opened ?? true,
        notify_action_proposed: json.data?.notify_action_proposed ?? true,
        notify_action_resolved: json.data?.notify_action_resolved ?? true,
      };
    },
    staleTime: 30_000,
  });

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setSaving(true);
    setSavedMessage(false);

    try {
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2500);
        queryClient.setQueryData(["notification-preferences"], updated);
        queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      }
    } catch (err) {
      console.error("Failed to update notification preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-(--surface) border border-(--line) flex items-center justify-center text-(--accent)">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-(--fg)">
              Email Notifications
            </h2>
            <p className="text-xs text-(--fg-muted)">
              Operational incident alerts delivered to{" "}
              <span className="font-mono text-(--fg)">{userEmail}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-xs text-(--fg-muted) flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {savedMessage && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}

          {/* Master Switch */}
          <button
            type="button"
            onClick={() => handleToggle("email_enabled")}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) ${
              prefs.email_enabled ? "bg-(--accent)" : "bg-(--surface)"
            }`}
            role="switch"
            aria-checked={prefs.email_enabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.email_enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Sub-notification Toggles */}
      <div
        className={`space-y-4 pt-4 border-t border-(--line) transition-opacity ${
          prefs.email_enabled ? "opacity-100" : "opacity-40 pointer-events-none"
        }`}
      >
        {/* Incident Opened */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-(--fg)">
                Incident Detected
              </div>
              <p className="text-xs text-(--fg-muted)">
                Immediate alert when a service health probe fails or error rate spikes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("notify_incident_opened")}
            disabled={!prefs.email_enabled}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.notify_incident_opened ? "bg-(--accent)" : "bg-(--surface)"
            }`}
            role="switch"
            aria-checked={prefs.notify_incident_opened}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.notify_incident_opened ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Action Proposed (Approval Required) */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-(--fg)">
                Rollback Approval Required
              </div>
              <p className="text-xs text-(--fg-muted)">
                Urgent notification with deep link to review candidate rollback and authorize execution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("notify_action_proposed")}
            disabled={!prefs.email_enabled}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.notify_action_proposed ? "bg-(--accent)" : "bg-(--surface)"
            }`}
            role="switch"
            aria-checked={prefs.notify_action_proposed}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.notify_action_proposed ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Action Verified / Resolved */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-(--fg)">
                Rollback Verified & Resolved
              </div>
              <p className="text-xs text-(--fg-muted)">
                Confirmation when rollback execution succeeds and health probes confirm system recovery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("notify_action_resolved")}
            disabled={!prefs.email_enabled}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.notify_action_resolved ? "bg-(--accent)" : "bg-(--surface)"
            }`}
            role="switch"
            aria-checked={prefs.notify_action_resolved}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.notify_action_resolved ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
