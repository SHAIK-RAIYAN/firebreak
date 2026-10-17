import type { IncidentStatus, ActionStatus as ActionStatusEnum } from "../domain/state.js";
import type { DeploymentRef, Evidence, PreflightCheck, Severity } from "../db/schema.js";
import type { Analysis } from "../ai/schema.js";

export type Status = IncidentStatus;

export type IncidentListItem = {
  id: string;
  number: number;
  title: string;
  status: Status;
  severity: Severity;
  service: { id: string; name: string };
  openedAt: string;
  resolvedAt: string | null;
  topSuspect: { shortSha: string; message: string } | null;
};

export type SuspectView = {
  id: string;
  rank: number;
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  committedAt: string;
  url: string;
  points: number;
  score: number;
  evidence: Evidence[];
  files: {
    path: string;
    status: string;
    additions: number;
    deletions: number;
    matched: boolean;
    patchExcerpt: string | null;
  }[];
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

export type TimelineEventView = {
  id: string;
  at: string;
  type: string;
  actorType: "system" | "user" | "mcp" | "ai";
  summary: string;
};

export type AnalysisView = {
  status: "pending" | "ready" | "failed" | "skipped";
  skipReason: string | null;
  provider: string | null;
  model: string | null;
  attempt: number;
  result: Analysis | null;
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

export type IncidentDetail = {
  incident: IncidentListItem & {
    traceStatus: string;
    traceError: string | null;
    traceConfidence: "high" | "low" | null;
    badDeployment: DeploymentRef | null;
    goodDeployment: DeploymentRef | null;
    alertCount: number;
    lastAlertAt: string;
    closedReason: string | null;
  };
  service: {
    id: string;
    name: string;
    repoOwner: string;
    repoName: string;
    healthUrl: string;
    vercelProjectName: string;
  };
  suspects: SuspectView[];
  analysis: AnalysisView | null;
  action: ActionStatusView | null;
  timeline: TimelineEventView[];
};

export type IncidentCard = {
  id: string;
  number: number;
  title: string;
  status: Status;
  severity: Severity;
  service: string;
  openedAt: string;
  bad: { shortSha: string | null } | null;
  good: { shortSha: string | null } | null;
  topSuspect: { shortSha: string; message: string; points: number } | null;
  action: { id: string; status: ActionStatusEnum } | null;
  appUrl: string;
};
