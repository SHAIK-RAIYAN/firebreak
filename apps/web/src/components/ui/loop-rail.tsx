export type LoopStep =
  | "detect"
  | "trace"
  | "propose"
  | "approve"
  | "execute"
  | "verify";

export const STEPS: { id: LoopStep; label: string }[] = [
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
  if (incidentStatus === "resolved" || actionStatus === "verified") return 6; // all 6 steps done
  if (incidentStatus === "verifying" || actionStatus === "verifying") return 5;
  if (actionStatus === "executing" || incidentStatus === "mitigating") return 4;
  if (actionStatus === "approved") return 4;
  if (actionStatus === "awaiting_approval" || incidentStatus === "awaiting_approval")
    return 3;
  if (actionStatus === "proposed") return 2;
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

  const isAllComplete = currentIndex >= STEPS.length;
  // Progress fraction from 0 (at step 0) to 1 (at step 5)
  const progressFraction = isAllComplete
    ? 1
    : Math.min(1, Math.max(0, currentIndex / (STEPS.length - 1)));

  return (
    <nav
      aria-label="Incident response progress"
      className={`w-full py-3.5 px-3 sm:px-6 bg-(--bg-raised) border border-(--line) rounded-xl ${className}`}
    >
      <div className="relative w-full">
        {/* Background baseline track: connects precisely center of marker 0 to center of marker 5 */}
        <div
          aria-hidden="true"
          className="absolute top-[11px] -translate-y-1/2 h-[2px] bg-(--line) z-0 pointer-events-none"
          style={{
            left: "calc(100% / 12)",
            right: "calc(100% / 12)",
          }}
        />

        {/* Active progress track: starts at center of marker 0 and grows toward marker 5 */}
        <div
          aria-hidden="true"
          className="absolute top-[11px] -translate-y-1/2 h-[2px] bg-(--accent) z-0 pointer-events-none transition-all duration-500 ease-out"
          style={{
            left: "calc(100% / 12)",
            width: `calc((100% - 100% / 6) * ${progressFraction})`,
          }}
        />

        {/* 6 Step Columns with equal width and centered markers */}
        <ol className="grid grid-cols-6 w-full relative z-10 m-0 p-0 list-none">
          {STEPS.map((step, idx) => {
            const isDone = isAllComplete || idx < currentIndex;
            const isCurrent = !isAllComplete && idx === currentIndex;

            return (
              <li
                key={step.id}
                className="flex flex-col items-center group cursor-default"
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Marker wrapper with fixed 22px height so the 14px dot's center is exactly at 11px */}
                <div className="h-[22px] flex items-center justify-center">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDone
                        ? "bg-(--accent) text-white scale-100 shadow-xs"
                        : isCurrent
                        ? "bg-(--bg) border-2 border-(--accent) ring-4 ring-(--accent)/25 scale-110"
                        : "bg-(--surface) border border-(--line-strong)"
                    }`}
                  >
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse" />
                    )}
                    {isDone && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Step label aligned consistently beneath its marker */}
                <span
                  className={`font-mono text-[9px] sm:text-[10px] md:text-[11px] tracking-wider uppercase select-none truncate max-w-full pt-1.5 transition-colors ${
                    isCurrent
                      ? "text-(--accent) font-bold"
                      : isDone
                      ? "text-(--fg) font-semibold"
                      : "text-(--fg-subtle) font-normal"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
