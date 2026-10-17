import { FileCode2 } from "lucide-react";

export function DiffBlock({
  filename,
  patch,
  matched = false,
  matchedLabel = "matches error stack frame",
  className = "",
}: {
  filename?: string | null;
  patch?: string | null;
  matched?: boolean;
  matchedLabel?: string;
  className?: string;
}) {
  if (!patch) return null;

  const lines = patch.split("\n");

  return (
    <div
      className={`border border-[var(--line)] bg-[var(--bg)] rounded-lg overflow-hidden font-mono text-xs ${className}`}
    >
      {filename && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--surface)] border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span
              className={`font-semibold ${
                matched ? "text-amber-400" : "text-[var(--fg)]"
              }`}
            >
              {filename}
            </span>
          </div>
          {matched && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
              {matchedLabel}
            </span>
          )}
        </div>
      )}

      <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed text-[var(--fg-muted)] selection:bg-[var(--accent)]/30">
        {lines.map((line, idx) => {
          const isAdd = line.startsWith("+");
          const isDel = line.startsWith("-");
          const isHunk = line.startsWith("@");

          let lineClass = "px-1.5 py-0.5 flex";
          if (isAdd) {
            lineClass += " text-emerald-400 bg-emerald-950/25";
          } else if (isDel) {
            lineClass += " text-rose-400 bg-rose-950/25";
          } else if (isHunk) {
            lineClass += " text-indigo-400/80 bg-indigo-950/20 font-semibold";
          }

          return (
            <div key={idx} className={lineClass}>
              <span className="w-8 shrink-0 text-right pr-3 select-none text-[var(--fg-subtle)] opacity-50">
                {idx + 1}
              </span>
              <span className="flex-1 break-all whitespace-pre-wrap">{line}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
