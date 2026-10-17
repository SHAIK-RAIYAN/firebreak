import { type ProbeView } from "@firebreak/core";

export function ProbeStrip({
  probes = [],
  max = 18,
  className = "",
}: {
  probes?: ProbeView[];
  max?: number;
  className?: string;
}) {
  const slots = Array.from({ length: max }, (_, idx) => {
    return probes[idx] ?? null;
  });

  const healthyCount = probes.filter((p) => p.ok).length;
  const avgLatency =
    probes.length > 0
      ? Math.round(
          probes.reduce((sum, p) => sum + (p.latencyMs ?? 0), 0) / probes.length,
        )
      : 0;

  return (
    <div className={`space-y-2 p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg ${className}`}>
      <div className="flex items-center justify-between font-mono text-xs text-[var(--fg-muted)]">
        <span className="font-semibold text-[var(--fg)]">
          {healthyCount} / {probes.length} healthy ({max - probes.length} remaining)
        </span>
        {avgLatency > 0 && (
          <span>avg {avgLatency} ms</span>
        )}
      </div>

      {/* Squares Strip */}
      <div className="flex items-center gap-[3px] overflow-x-auto py-1">
        {slots.map((probe, idx) => {
          if (!probe) {
            return (
              <div
                key={`empty-${idx}`}
                className="w-3 h-3 rounded-[2px] bg-[var(--line)] shrink-0 opacity-40"
                title={`Probe ${idx + 1}: pending`}
              />
            );
          }

          const isOk = probe.ok;
          return (
            <div
              key={`probe-${probe.seq || idx}`}
              className={`w-3 h-3 rounded-[2px] shrink-0 transition-all duration-200 transform scale-100 ${
                isOk ? "bg-[var(--ok)] shadow-[0_0_6px_var(--ok)]" : "bg-[var(--danger)] shadow-[0_0_6px_var(--danger)]"
              }`}
              title={`Probe ${probe.seq}: ${isOk ? "OK" : "FAIL"} (${probe.httpStatus ?? "timeout"} in ${probe.latencyMs ?? 0}ms)`}
            />
          );
        })}
      </div>
    </div>
  );
}
