/**
 * Copied from packages/core/src/views/types.ts — keep in sync.
 */

export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus =
  | "open"
  | "triaged"
  | "awaiting_approval"
  | "approved"
  | "mitigating"
  | "verifying"
  | "resolved"
  | "mitigation_failed"
  | "dismissed";

export type ActionStatusEnum =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "verifying"
  | "verified"
  | "verification_failed"
  | "failed"
  | "expired"
  | "cancelled";

export type IncidentCard = {
  id: string;
  number: number;
  title: string;
  status: IncidentStatus;
  severity: Severity;
  service: string;
  openedAt: string;
  bad: { shortSha: string | null } | null;
  good: { shortSha: string | null } | null;
  topSuspect: { shortSha: string; message: string; points: number } | null;
  action: { id: string; status: ActionStatusEnum } | null;
  appUrl: string;
};

export type SuspectListPayload = {
  incident: { id: string; number: number; title: string };
  deployments: {
    bad: { id: string; shortSha: string | null } | null;
    good: { id: string; shortSha: string | null } | null;
  };
  confidence: "high" | "low" | null;
  suspects: {
    rank: number;
    shortSha: string;
    message: string;
    author: string;
    points: number;
    score: number;
    url: string;
    evidence: { kind: string; label: string }[];
    files: { path: string; matched: boolean }[];
  }[];
};

export type PreflightCheck = {
  id: string;
  name: string;
  ok: boolean;
  blocking: boolean;
  detail: string;
};

export type ProbeView = {
  seq: number;
  at: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  observedSha: string | null;
  error: string | null;
};

export type ActionStatusView = {
  id: string;
  incident: { id: string; number: number; title: string };
  status: ActionStatusEnum;
  target: { id: string; shortSha: string | null; url: string; createdAt: string };
  from: { id: string; shortSha: string | null };
  preflight: PreflightCheck[];
  expiresAt: string;
  approveUrl: string;
  decidedVia: "web" | "mcp" | null;
  probes: ProbeView[];
  verdict: "pending" | "verified" | "failed" | null;
  message: string;
};
