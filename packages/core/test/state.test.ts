import { describe, it, expect } from "vitest";
import {
  transitionIncident,
  transitionAction,
  InvalidTransitionError,
  type IncidentStatus,
  type ActionStatus,
} from "../src/domain/state.js";

describe("state machines", () => {
  describe("IncidentStatus transitions (doc 06 §3.1)", () => {
    it("handles allowed open transitions", () => {
      expect(
        transitionIncident("open", { type: "trace_ready", hasTarget: true }),
      ).toBe("awaiting_approval");
      expect(
        transitionIncident("open", { type: "trace_ready", hasTarget: false }),
      ).toBe("triaged");
      expect(transitionIncident("open", { type: "trace_failed" })).toBe("triaged");
    });

    it("handles triaged transitions", () => {
      expect(transitionIncident("triaged", { type: "action_proposed" })).toBe(
        "awaiting_approval",
      );
    });

    it("handles awaiting_approval transitions", () => {
      expect(
        transitionIncident("awaiting_approval", { type: "action_rejected" }),
      ).toBe("triaged");
      expect(
        transitionIncident("awaiting_approval", { type: "action_expired" }),
      ).toBe("triaged");
      expect(
        transitionIncident("awaiting_approval", { type: "action_cancelled" }),
      ).toBe("triaged");
      expect(
        transitionIncident("awaiting_approval", { type: "action_approved" }),
      ).toBe("mitigating");
    });

    it("handles mitigating transitions", () => {
      expect(
        transitionIncident("mitigating", { type: "approval_dispatch_failed" }),
      ).toBe("awaiting_approval");
      expect(
        transitionIncident("mitigating", { type: "action_cancelled" }),
      ).toBe("triaged");
      expect(
        transitionIncident("mitigating", { type: "action_executed" }),
      ).toBe("verifying");
      expect(
        transitionIncident("mitigating", { type: "action_failed" }),
      ).toBe("mitigation_failed");
    });

    it("handles verifying transitions", () => {
      expect(transitionIncident("verifying", { type: "verified" })).toBe(
        "resolved",
      );
      expect(
        transitionIncident("verifying", { type: "verification_failed" }),
      ).toBe("mitigation_failed");
    });

    it("handles mitigation_failed retry transition", () => {
      expect(
        transitionIncident("mitigation_failed", { type: "action_proposed" }),
      ).toBe("awaiting_approval");
    });

    it("handles manual resolve and dismiss from non-terminal states", () => {
      const nonTerminal: IncidentStatus[] = [
        "open",
        "triaged",
        "awaiting_approval",
        "mitigating",
        "verifying",
        "mitigation_failed",
      ];
      for (const st of nonTerminal) {
        expect(transitionIncident(st, { type: "manual_resolve" })).toBe(
          "resolved",
        );
        expect(transitionIncident(st, { type: "dismiss" })).toBe("dismissed");
      }
    });

    it("throws on representative invalid transitions", () => {
      // 1. resolved -> verifying
      expect(() =>
        transitionIncident("resolved", { type: "action_executed" }),
      ).toThrow(InvalidTransitionError);

      // 2. awaiting_approval -> verified
      expect(() =>
        transitionIncident("awaiting_approval", { type: "verified" }),
      ).toThrow(InvalidTransitionError);

      // 3. dismissed -> open
      expect(() =>
        transitionIncident("dismissed", { type: "action_proposed" }),
      ).toThrow(InvalidTransitionError);
    });
  });

  describe("ActionStatus transitions (doc 06 §3.2)", () => {
    it("handles proposed transitions", () => {
      expect(transitionAction("proposed", { type: "preflight_ok" })).toBe(
        "awaiting_approval",
      );
      expect(transitionAction("proposed", { type: "preflight_failed" })).toBe(
        "cancelled",
      );
    });

    it("handles awaiting_approval transitions", () => {
      expect(transitionAction("awaiting_approval", { type: "approve" })).toBe(
        "approved",
      );
      expect(transitionAction("awaiting_approval", { type: "reject" })).toBe(
        "rejected",
      );
      expect(transitionAction("awaiting_approval", { type: "expire" })).toBe(
        "expired",
      );
      expect(transitionAction("awaiting_approval", { type: "cancel" })).toBe(
        "cancelled",
      );
    });

    it("handles approved transitions", () => {
      expect(
        transitionAction("approved", { type: "approval_dispatch_failed" }),
      ).toBe("awaiting_approval");
      expect(transitionAction("approved", { type: "cancel" })).toBe(
        "cancelled",
      );
      expect(transitionAction("approved", { type: "execute" })).toBe(
        "executing",
      );
    });

    it("handles executing transitions", () => {
      expect(transitionAction("executing", { type: "confirm" })).toBe(
        "verifying",
      );
      expect(transitionAction("executing", { type: "fail" })).toBe("failed");
    });

    it("handles verifying transitions", () => {
      expect(transitionAction("verifying", { type: "verified" })).toBe(
        "verified",
      );
      expect(
        transitionAction("verifying", { type: "verification_failed" }),
      ).toBe("verification_failed");
    });

    it("throws on representative invalid transitions", () => {
      // 4. rejected -> approved
      expect(() =>
        transitionAction("rejected", { type: "approve" }),
      ).toThrow(InvalidTransitionError);

      // 5. verified -> executing
      expect(() =>
        transitionAction("verified", { type: "execute" }),
      ).toThrow(InvalidTransitionError);
    });
  });
});
