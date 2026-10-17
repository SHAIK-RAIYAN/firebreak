import { newId } from "@firebreak/core";

export default function Home() {
  const sampleId = newId("inc");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-md w-full border border-[var(--line)] bg-[var(--bg-raised)] p-6 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--ember)]" />
          <h1 className="text-xl font-bold font-mono tracking-tight">firebreak</h1>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Stop the spread. Roll back bad deploys with proof.
        </p>
        <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded font-mono text-xs text-[var(--fg-subtle)]">
          Core verified: <span className="text-[var(--accent)] font-semibold">{sampleId}</span>
        </div>
      </div>
    </main>
  );
}
