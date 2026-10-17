import { scrubSecrets } from "../crypto/scrub.js";
import type { SuspectFile, Evidence } from "../db/schema.js";

export function xmlEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface BuildBundleInput {
  incident: {
    id: string;
    opened_at: Date;
    bad_deployment: { sha?: string | null; createdAt?: string } | null;
    good_deployment: { sha?: string | null; createdAt?: string } | null;
  };
  service: {
    name: string;
  };
  alert: {
    severity: string;
    source: string;
    payload: {
      error?: {
        type?: string;
        message?: string;
        frames?: Array<{
          file: string;
          line?: number | null;
          function?: string | null;
          source?: string;
        }>;
      };
    };
  } | null;
  suspects: Array<{
    id: string;
    rank: number;
    points: number;
    score: number;
    sha: string;
    author_name: string;
    message: string;
    evidence: Evidence[];
    files: SuspectFile[];
  }>;
  proposedAction?: {
    type: string;
    target_sha?: string | null;
  } | null;
}

export function buildIncidentBundle(input: BuildBundleInput): string {
  const { incident, service, alert, suspects, proposedAction } = input;

  const errorType = alert?.payload?.error?.type ?? "Error";
  const errorMessage = alert?.payload?.error?.message ?? "An error occurred";
  const frames = (alert?.payload?.error?.frames ?? []).slice(0, 10);

  const topSuspects = suspects.slice(0, 5);

  const parts: string[] = [];

  parts.push(
    `<incident id="${xmlEscape(incident.id)}" service="${xmlEscape(service.name)}" opened_at="${xmlEscape(incident.opened_at.toISOString())}">`,
  );

  parts.push(
    `  <alert severity="${xmlEscape(alert?.severity ?? "critical")}" source="${xmlEscape(alert?.source ?? "unknown")}">`,
  );
  parts.push(
    `    <untrusted_error type="${xmlEscape(errorType)}">${xmlEscape(errorMessage)}</untrusted_error>`,
  );
  parts.push("    <frames>");
  frames.forEach((frame, idx) => {
    parts.push(
      `      <frame idx="${idx}" file="${xmlEscape(frame.file)}" line="${xmlEscape(frame.line ?? "")}" function="${xmlEscape(frame.function ?? "")}" source="${xmlEscape(frame.source ?? "stack")}"/>`,
    );
  });
  parts.push("    </frames>");
  parts.push("  </alert>");

  const badSha = incident.bad_deployment?.sha ? incident.bad_deployment.sha.slice(0, 7) : "";
  const goodSha = incident.good_deployment?.sha ? incident.good_deployment.sha.slice(0, 7) : "";
  const badCreatedAt = incident.bad_deployment?.createdAt ?? "";
  const goodCreatedAt = incident.good_deployment?.createdAt ?? "";

  parts.push(
    `  <deployments bad_sha="${xmlEscape(badSha)}" good_sha="${xmlEscape(goodSha)}" bad_created_at="${xmlEscape(badCreatedAt)}" good_created_at="${xmlEscape(goodCreatedAt)}"/>`,
  );

  parts.push("  <suspects>");
  for (const s of topSuspects) {
    const sSha = s.sha ? s.sha.slice(0, 7) : "";
    parts.push(
      `    <suspect id="${xmlEscape(s.id)}" rank="${s.rank}" points="${s.points}" score="${s.score.toFixed(2)}" sha="${xmlEscape(sSha)}" author="${xmlEscape(s.author_name)}">`,
    );
    parts.push(`      <untrusted_commit_message>${xmlEscape(s.message)}</untrusted_commit_message>`);

    if (s.evidence && s.evidence.length > 0) {
      for (const ev of s.evidence) {
        parts.push(
          `      <evidence id="${xmlEscape(ev.id)}" kind="${xmlEscape(ev.kind)}">${xmlEscape(ev.label)}</evidence>`,
        );
      }
    }

    const files = (s.files ?? []).slice(0, 3);
    for (const f of files) {
      if (f.patchExcerpt) {
        const scrubbedDiff = scrubSecrets(f.patchExcerpt);
        const diffLines = scrubbedDiff.split("\n").slice(0, 60).join("\n");
        parts.push(`      <untrusted_diff file="${xmlEscape(f.path)}">`);
        parts.push(xmlEscape(diffLines));
        parts.push("      </untrusted_diff>");
      }
    }

    parts.push("    </suspect>");
  }
  parts.push("  </suspects>");

  if (proposedAction) {
    parts.push(
      `  <proposed_action type="${xmlEscape(proposedAction.type)}" target_sha="${xmlEscape(proposedAction.target_sha ?? "")}"/>`,
    );
  }

  parts.push("</incident>");

  return parts.join("\n");
}
