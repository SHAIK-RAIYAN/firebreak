"use client";

import { useState } from "react";
import Link from "next/link";
import { type AnalysisView } from "@firebreak/core";
import { DiffBlock } from "./diff-block";
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle, Info } from "lucide-react";

export function ExplanationCard({
  incidentId,
  analysis,
  onRetry,
}: {
  incidentId: string;
  analysis?: AnalysisView | null;
  onRetry?: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);
  const [openFixIdx, setOpenFixIdx] = useState<number | null>(0);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        await fetch(`/api/v1/incidents/${incidentId}/analysis/retry`, {
          method: "POST",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRetrying(false);
    }
  };

  // State 1: Pending analysis
  if (!analysis || analysis.status === "pending") {
    return (
      <div className="border border-(--line) bg-(--bg-raised) rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-(--line)">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-(--surface) border border-(--line) text-(--accent) font-semibold uppercase">
              ADVISORY
            </span>
            <span className="text-sm font-semibold text-(--fg)">
              AI Incident Analysis
            </span>
          </div>
          <span className="text-xs font-mono text-(--fg-muted) animate-pulse">
            Analysing evidence…
          </span>
        </div>
        <div className="space-y-2.5 animate-pulse">
          <div className="h-4 bg-(--surface) rounded w-3/4" />
          <div className="h-4 bg-(--surface) rounded w-1/2" />
          <div className="h-20 bg-(--surface) rounded w-full" />
        </div>
      </div>
    );
  }

  // State 2: Skipped analysis
  if (analysis.status === "skipped") {
    return (
      <div className="border border-(--line) bg-(--bg-raised) rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Info className="w-4 h-4 text-(--fg-muted)" />
          <span className="text-sm text-(--fg-muted)">
            AI analysis skipped: {analysis.skipReason || "no provider key configured"}.
          </span>
        </div>
        <Link
          href="/app/settings/ai"
          className="text-xs font-mono font-semibold text-(--accent) hover:underline"
        >
          Add an AI key &rarr;
        </Link>
      </div>
    );
  }

  // State 3: Failed analysis
  if (analysis.status === "failed") {
    return (
      <div className="border border-rose-900/30 bg-rose-950/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-rose-300">
              Analysis failed
            </span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-(--surface) border border-(--line) hover:bg-(--line) font-mono text-xs text-(--fg)"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
            <span>Retry analysis</span>
          </button>
        </div>
      </div>
    );
  }

  // State 4: Ready
  const data = analysis.result;
  if (!data) return null;

  return (
    <div className="border border-(--line) bg-(--bg-raised) rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-(--line)">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-(--surface) border border-(--line) text-(--accent) font-semibold uppercase">
            ADVISORY
          </span>
          <span className="text-sm font-semibold text-(--fg)">
            AI Root Cause Analysis
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-(--fg-muted)">
          {analysis.provider && analysis.model && (
            <span>
              {analysis.provider} &bull; {analysis.model}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded uppercase font-semibold text-[10px] ${
              data.confidence === "high"
                ? "bg-emerald-500/10 text-(--ok)"
                : data.confidence === "medium"
                ? "bg-amber-500/10 text-(--warn)"
                : "bg-(--surface) text-(--fg-muted)"
            }`}
          >
            {data.confidence} confidence
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <p className="text-sm font-medium leading-relaxed text-(--fg)">
          {data.summary}
        </p>
      </div>

      {/* Likely Cause */}
      {data.likelyCause && (
        <div className="p-3.5 rounded-lg bg-(--surface) border border-(--line) space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-(--accent) uppercase tracking-wide">
              Likely Cause
            </span>
            {data.likelyCause.suspectId && (
              <span className="text-(--fg-muted)">
                Suspect: {data.likelyCause.suspectId}
              </span>
            )}
          </div>
          <p className="text-xs text-(--fg) leading-relaxed">
            {data.likelyCause.explanation}
          </p>
        </div>
      )}

      {/* Rollback Assessment */}
      {data.rollbackAssessment && (
        <div className="flex items-start gap-2.5 text-xs font-mono p-3 rounded-lg bg-(--bg) border border-(--line)">
          <span
            className={`px-1.5 py-0.5 rounded font-bold uppercase ${
              data.rollbackAssessment.agrees
                ? "bg-emerald-500/10 text-(--ok)"
                : "bg-amber-500/10 text-(--warn)"
            }`}
          >
            {data.rollbackAssessment.agrees ? "Agrees with rollback" : "Advises caution"}
          </span>
          <span className="text-(--fg-muted) flex-1 leading-relaxed">
            {data.rollbackAssessment.reason}
          </span>
        </div>
      )}

      {/* Fix Suggestions */}
      {data.fixSuggestions && data.fixSuggestions.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-mono font-semibold uppercase tracking-wide text-(--fg-muted)">
            Suggested Fixes ({data.fixSuggestions.length})
          </div>
          <div className="space-y-2">
            {data.fixSuggestions.map((fix, idx) => {
              const isOpen = openFixIdx === idx;
              return (
                <div
                  key={idx}
                  className="border border-(--line) rounded-lg overflow-hidden bg-(--bg)"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFixIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-3 hover:bg-(--surface) transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-(--accent)" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-(--fg-muted)" />
                      )}
                      <span className="text-xs font-semibold text-(--fg)">
                        {fix.title}
                      </span>
                    </div>
                    {fix.file && (
                      <span className="text-[11px] font-mono text-(--fg-muted)">
                        {fix.file}
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-3.5 border-t border-(--line) space-y-3 bg-(--bg-raised)">
                      <p className="text-xs text-(--fg) leading-relaxed">
                        {fix.description}
                      </p>
                      {fix.patch && (
                        <DiffBlock filename={fix.file} patch={fix.patch} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unknowns / Caveats */}
      {data.unknowns && data.unknowns.length > 0 && (
        <div className="pt-2 border-t border-(--line) space-y-1">
          <span className="text-[11px] font-mono text-(--fg-subtle) uppercase">
            Unknowns &amp; Limitations
          </span>
          <ul className="list-disc list-inside text-xs font-mono text-(--fg-subtle) space-y-0.5">
            {data.unknowns.map((un, idx) => (
              <li key={idx}>{un}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
