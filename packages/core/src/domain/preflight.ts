import type { DeploymentRef, PreflightCheck } from "../db/schema.js";

export type ProbeSummary = {
  ok: boolean;
  httpStatus?: number | null;
  latencyMs?: number | null;
  observedSha?: string | null;
  error?: string | null;
};

export type PreflightInput = {
  target: DeploymentRef;
  current: DeploymentRef;
  from: DeploymentRef;
  knownBadIds: string[];
  now: Date;
  expiresAt: Date;
  latestProbe?: ProbeSummary | null;
};

/**
 * Pure evaluation function for rollback proposal preflight checks per doc 03 §9.1.
 */
export function evaluatePreflight(input: PreflightInput): PreflightCheck[] {
  const { target, current, from, knownBadIds, now, expiresAt, latestProbe } = input;

  const checks: PreflightCheck[] = [];

  // 1. target_ready (blocking)
  const isTargetReady = target.state === "READY";
  checks.push({
    id: "target_ready",
    ok: isTargetReady,
    blocking: true,
    detail: isTargetReady
      ? `Target deployment is in READY state (${target.id})`
      : `Target deployment state is '${target.state}', expected 'READY'`,
  });

  // 2. target_differs (blocking)
  const isTargetDiffers =
    target.id !== current.id &&
    (target.sha !== current.sha || target.sha === null || current.sha === null);
  checks.push({
    id: "target_differs",
    ok: isTargetDiffers,
    blocking: true,
    detail: isTargetDiffers
      ? `Target deployment (${target.id}) differs from current production (${current.id})`
      : "Target deployment is identical to the current production deployment",
  });

  // 3. target_not_known_bad (blocking)
  const isNotKnownBad = !knownBadIds.includes(target.id);
  checks.push({
    id: "target_not_known_bad",
    ok: isNotKnownBad,
    blocking: true,
    detail: isNotKnownBad
      ? "Target deployment has not caused an earlier incident"
      : `Target deployment (${target.id}) was marked bad in a previous incident`,
  });

  // 4. no_drift (blocking)
  const isNoDrift = current.id === from.id;
  checks.push({
    id: "no_drift",
    ok: isNoDrift,
    blocking: true,
    detail: isNoDrift
      ? "Production deployment has not drifted since proposal"
      : `Production drift detected: proposed on ${from.id}, currently at ${current.id}`,
  });

  // 5. not_expired (blocking)
  const isNotExpired = now.getTime() < expiresAt.getTime();
  checks.push({
    id: "not_expired",
    ok: isNotExpired,
    blocking: true,
    detail: isNotExpired
      ? `Proposal valid until ${expiresAt.toISOString()}`
      : `Proposal expired at ${expiresAt.toISOString()}`,
  });

  // 6. still_failing (non-blocking warning check)
  // ok when latestProbe is failing. If service looks healthy, ok = false (warning).
  const isServiceFailing = latestProbe ? !latestProbe.ok : true;
  checks.push({
    id: "still_failing",
    ok: isServiceFailing,
    blocking: false,
    detail: isServiceFailing
      ? "Service health check is currently failing"
      : "Service looks healthy right now — rollback may be unnecessary",
  });

  return checks;
}

/**
 * Determine if action can execute based on preflight checks.
 * All blocking checks must pass.
 */
export function canExecute(checks: PreflightCheck[]): boolean {
  return checks.filter((c) => c.blocking).every((c) => c.ok);
}
