import { Shield, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";

export function SecuritySection() {
  return (
    <section id="security" className="py-24 border-t border-[var(--line)] bg-[var(--bg)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4 font-mono text-xs text-[var(--accent)] tracking-wider">
          <span>[05]</span>
          <span>SECURITY &amp; CONTROL</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)] mb-4">
          Safe by construction.
        </h2>
        <p className="text-[var(--fg-muted)] max-w-2xl text-base sm:text-lg mb-12">
          Designed for high-consequence production environments. You stay in complete control at every step.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tile 1: Human Approval */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--line)] rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)]">Human approval, always.</h3>
              <p className="text-sm text-[var(--fg-muted)]">
                Zero autonomous changes to production. Rollbacks require explicit human operator confirmation.
              </p>
            </div>
            <div className="p-3 bg-[var(--bg-raised)] rounded-lg border border-[var(--line)] font-mono text-xs text-[var(--fg-subtle)] flex items-center justify-between">
              <span>MUTATION POLICY:</span>
              <span className="text-[var(--ok)] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>EXPLICIT_APPROVAL</span>
              </span>
            </div>
          </div>

          {/* Tile 2: Drift-checked */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--line)] rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--ok)]/10 text-[var(--ok)] flex items-center justify-center mb-3">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)]">Drift-checked before it runs.</h3>
              <p className="text-sm text-[var(--fg-muted)]">
                Re-probes production milliseconds before execution. If another commit was deployed, it aborts safely.
              </p>
            </div>
            <div className="p-3 bg-[var(--bg-raised)] rounded-lg border border-[var(--line)] font-mono text-xs text-[var(--fg-subtle)] flex items-center justify-between">
              <span>PREFLIGHT VALIDATION:</span>
              <span className="text-[var(--accent)] font-semibold">TARGET_READY &amp; NO_DRIFT</span>
            </div>
          </div>

          {/* Tile 3: Key sealing */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--line)] rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--ember)]/10 text-[var(--ember)] flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)]">Keys sealed with AES-256-GCM.</h3>
              <p className="text-sm text-[var(--fg-muted)]">
                Vercel tokens and AI keys are encrypted with workspace-bound AAD. Zero plaintext tokens in logs or DB.
              </p>
            </div>
            <div className="p-3 bg-[var(--bg-raised)] rounded-lg border border-[var(--line)] font-mono text-xs text-[var(--fg-subtle)] flex items-center justify-between">
              <span>ENCRYPTION SPEC:</span>
              <span className="text-[var(--fg)] font-semibold">AES-256-GCM + WORKSPACE_AAD</span>
            </div>
          </div>

          {/* Tile 4: Immutable Record */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--line)] rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--info)]/10 text-[var(--info)] flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)]">Every step on the record.</h3>
              <p className="text-sm text-[var(--fg-muted)]">
                Complete timeline audit trail of alerts, suspect rankings, operator approvals, and probe receipts.
              </p>
            </div>
            <div className="p-3 bg-[var(--bg-raised)] rounded-lg border border-[var(--line)] font-mono text-xs text-[var(--fg-subtle)] flex items-center justify-between">
              <span>AUDIT RETENTION:</span>
              <span className="text-[var(--ok)] font-semibold">FULL_EVENT_TIMELINE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
