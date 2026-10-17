export type LoopStep =
  | "detect"
  | "trace"
  | "propose"
  | "approve"
  | "execute"
  | "verify";

const STEPS: { id: LoopStep; label: string }[] = [
  { id: "detect", label: "DETECT" },
  { id: "trace", label: "TRACE" },
  { id: "propose", label: "PROPOSE" },
  { id: "approve", label: "APPROVE" },
  { id: "execute", label: "EXECUTE" },
  { id: "verify", label: "VERIFY" },
];

export function getStepIndexFromStatus(
  incidentStatus: string,
  actionStatus?: string | null,
): number {
  if (incidentStatus === "resolved") return 5; // verify done
  if (incidentStatus === "verifying" || actionStatus === "verifying") return 5;
  if (actionStatus === "executing" || incidentStatus === "mitigating") return 4;
  if (actionStatus === "approved") return 3;
  if (actionStatus === "awaiting_approval" || incidentStatus === "awaiting_approval")
    return 2;
  if (incidentStatus === "triaged") return 1;
  return 0; // detect
}

export function LoopRail({
  currentStep,
  className = "",
}: {
  currentStep: LoopStep | number;
  className?: string;
}) {
  const currentIndex =
    typeof currentStep === "number"
      ? currentStep
      : STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className={`w-full py-3 px-4 bg-[var(--bg-raised)] border border-[var(--line)] rounded-xl ${className}`}>
      <div className="relative flex items-center justify-between">
        {/* Background track line */}
        <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-[var(--line)] -translate-y-1/2 z-0" />

        {/* Filled progress line */}
        <div
          className="absolute top-1/2 left-4 h-[1px] bg-[var(--accent)] -translate-y-1/2 z-0 transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, (Math.max(0, currentIndex) / (STEPS.length - 1)) * 95)}%`,
          }}
        />

        {/* Step nodes */}
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? "bg-[var(--accent)] text-white scale-100"
                    : isCurrent
                    ? "bg-[var(--bg)] border-2 border-[var(--accent)] ring-4 ring-[var(--accent)]/20"
                    : "bg-[var(--bg)] border border-[var(--line-strong)]"
                }`}
              >
                {isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                )}
                {isDone && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span
                className={`font-mono text-[10px] tracking-wider uppercase font-semibold select-none ${
                  isCurrent
                    ? "text-[var(--accent)]"
                    : isDone
                    ? "text-[var(--fg)]"
                    : "text-[var(--fg-subtle)]"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
