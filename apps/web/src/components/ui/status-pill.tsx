import { type IncidentStatus } from "@firebreak/core";

export function StatusPill({
  status,
  size = "md",
  className = "",
}: {
  status: IncidentStatus | string;
  size?: "sm" | "md";
  className?: string;
}) {
  let label = status;
  let bg = "bg-(--surface)";
  let border = "border-(--line)";
  let text = "text-(--fg-muted)";
  let dot = "bg-(--fg-muted)";
  let pulsing = false;

  switch (status) {
    case "open":
      label = "Investigating";
      bg = "bg-amber-950/20";
      border = "border-amber-800/40";
      text = "text-amber-300";
      dot = "bg-amber-400";
      pulsing = true;
      break;
    case "triaged":
      label = "Triaged";
      bg = "bg-(--surface)";
      border = "border-(--line-strong)";
      text = "text-(--fg)";
      dot = "bg-purple-400";
      break;
    case "awaiting_approval":
      label = "Needs approval";
      bg = "bg-amber-500/10";
      border = "border-amber-500/40";
      text = "text-(--warn)";
      dot = "bg-(--warn)";
      pulsing = true;
      break;
    case "mitigating":
      label = "Rolling back";
      bg = "bg-indigo-500/10";
      border = "border-indigo-500/40";
      text = "text-(--info)";
      dot = "bg-(--info)";
      pulsing = true;
      break;
    case "verifying":
      label = "Verifying";
      bg = "bg-indigo-500/10";
      border = "border-indigo-500/40";
      text = "text-(--info)";
      dot = "bg-(--info)";
      pulsing = true;
      break;
    case "resolved":
      label = "Recovered";
      bg = "bg-emerald-500/10";
      border = "border-emerald-500/30";
      text = "text-(--ok)";
      dot = "bg-(--ok)";
      break;
    case "mitigation_failed":
      label = "Still failing";
      bg = "bg-rose-500/10";
      border = "border-rose-500/40";
      text = "text-(--danger)";
      dot = "bg-(--danger)";
      break;
    case "dismissed":
      label = "Dismissed";
      bg = "bg-(--surface)";
      border = "border-(--line)";
      text = "text-(--fg-subtle)";
      dot = "bg-(--fg-subtle)";
      break;
    default:
      label = status;
      break;
  }

  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase font-semibold rounded-full border ${bg} ${border} ${text} ${px} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${
          pulsing ? "animate-pulse" : ""
        }`}
      />
      <span>{label}</span>
    </span>
  );
}
