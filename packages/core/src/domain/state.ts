export type IncidentStatus =
  | "open"
  | "triaged"
  | "awaiting_approval"
  | "mitigating"
  | "verifying"
  | "resolved"
  | "mitigation_failed"
  | "dismissed";

export type IncidentEvent =
  | { type: "trace_ready"; hasTarget: boolean }
  | { type: "trace_failed" }
  | { type: "action_proposed" }
  | { type: "action_rejected" }
  | { type: "action_expired" }
  | { type: "action_cancelled" }
  | { type: "action_approved" }
  | { type: "approval_dispatch_failed" }
  | { type: "action_executed" }
  | { type: "action_failed" }
  | { type: "verified" }
  | { type: "verification_failed" }
  | { type: "manual_resolve" }
  | { type: "dismiss" };

export type ActionStatus =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "verifying"
  | "verified"
  | "verification_failed"
  | "failed"
  | "rejected"
  | "expired"
  | "cancelled";

export type ActionEvent =
  | { type: "preflight_ok" }
  | { type: "preflight_failed" }
  | { type: "approve" }
  | { type: "reject" }
  | { type: "expire" }
  | { type: "cancel" }
  | { type: "approval_dispatch_failed" }
  | { type: "execute" }
  | { type: "confirm" }
  | { type: "fail" }
  | { type: "verified" }
  | { type: "verification_failed" };

export class InvalidTransitionError extends Error {
  readonly current: string;
  readonly event: string;

  constructor(machine: "incident" | "action", current: string, event: string) {
    super(`Invalid ${machine} transition: cannot handle '${event}' from '${current}'`);
    this.name = "InvalidTransitionError";
    this.current = current;
    this.event = event;
    Object.setPrototypeOf(this, InvalidTransitionError.prototype);
  }
}

/**
 * Pure transition function for IncidentStatus state machine per doc 06 §3.1.
 */
export function transitionIncident(
  current: IncidentStatus,
  event: IncidentEvent,
): IncidentStatus {
  // Terminal states cannot transition to anything
  if (current === "resolved" || current === "dismissed") {
    throw new InvalidTransitionError("incident", current, event.type);
  }

  // Universal transitions from any non-terminal state
  if (event.type === "manual_resolve") {
    return "resolved";
  }
  if (event.type === "dismiss") {
    return "dismissed";
  }

  switch (current) {
    case "open":
      if (event.type === "trace_ready") {
        return event.hasTarget ? "awaiting_approval" : "triaged";
      }
      if (event.type === "trace_failed") {
        return "triaged";
      }
      break;

    case "triaged":
      if (event.type === "action_proposed") {
        return "awaiting_approval";
      }
      break;

    case "awaiting_approval":
      if (
        event.type === "action_rejected" ||
        event.type === "action_expired" ||
        event.type === "action_cancelled"
      ) {
        return "triaged";
      }
      if (event.type === "action_approved") {
        return "mitigating";
      }
      break;

    case "mitigating":
      if (event.type === "approval_dispatch_failed") {
        return "awaiting_approval";
      }
      if (event.type === "action_cancelled") {
        return "triaged";
      }
      if (event.type === "action_executed") {
        return "verifying";
      }
      if (event.type === "action_failed") {
        return "mitigation_failed";
      }
      break;

    case "verifying":
      if (event.type === "verified") {
        return "resolved";
      }
      if (event.type === "verification_failed") {
        return "mitigation_failed";
      }
      break;

    case "mitigation_failed":
      if (event.type === "action_proposed") {
        return "awaiting_approval";
      }
      break;
  }

  throw new InvalidTransitionError("incident", current, event.type);
}

/**
 * Pure transition function for ActionStatus state machine per doc 06 §3.2.
 */
export function transitionAction(
  current: ActionStatus,
  event: ActionEvent,
): ActionStatus {
  // Terminal states cannot transition
  if (
    current === "verified" ||
    current === "verification_failed" ||
    current === "failed" ||
    current === "rejected" ||
    current === "expired" ||
    current === "cancelled"
  ) {
    throw new InvalidTransitionError("action", current, event.type);
  }

  switch (current) {
    case "proposed":
      if (event.type === "preflight_ok") {
        return "awaiting_approval";
      }
      if (event.type === "preflight_failed" || event.type === "cancel") {
        return "cancelled";
      }
      break;

    case "awaiting_approval":
      if (event.type === "approve") {
        return "approved";
      }
      if (event.type === "reject") {
        return "rejected";
      }
      if (event.type === "expire") {
        return "expired";
      }
      if (event.type === "cancel") {
        return "cancelled";
      }
      break;

    case "approved":
      if (event.type === "approval_dispatch_failed") {
        return "awaiting_approval";
      }
      if (event.type === "cancel" || event.type === "preflight_failed") {
        return "cancelled";
      }
      if (event.type === "execute") {
        return "executing";
      }
      break;

    case "executing":
      if (event.type === "confirm") {
        return "verifying";
      }
      if (event.type === "fail") {
        return "failed";
      }
      break;

    case "verifying":
      if (event.type === "verified") {
        return "verified";
      }
      if (event.type === "verification_failed") {
        return "verification_failed";
      }
      break;
  }

  throw new InvalidTransitionError("action", current, event.type);
}
