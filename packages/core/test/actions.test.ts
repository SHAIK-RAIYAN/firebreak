import { describe, it, expect, vi } from "vitest";
import {
  evaluatePreflight,
  approveAction,
  mcpCtx,
  userCtx,
  systemCtx,
  type DeploymentRef,
} from "../src/index.js";
import { AppError } from "../src/domain/errors.js";

describe("Milestone 5 - Actions Lifecycle", () => {
  describe("Preflight evaluation (doc 03 §9.1)", () => {
    const baseTarget: DeploymentRef = {
      id: "dpl_good",
      url: "https://good.vercel.app",
      sha: "3ab9d04111",
      createdAt: "2026-10-17T10:00:00.000Z",
      state: "READY",
      branch: "main",
    };

    const baseCurrent: DeploymentRef = {
      id: "dpl_bad",
      url: "https://bad.vercel.app",
      sha: "9f1c2e7222",
      createdAt: "2026-10-17T11:00:00.000Z",
      state: "READY",
      branch: "main",
    };

    it("passes all checks when target is ready, differs, not known bad, no drift, unexpired", () => {
      const now = new Date("2026-10-17T11:05:00.000Z");
      const expiresAt = new Date("2026-10-17T11:20:00.000Z");

      const checks = evaluatePreflight({
        target: baseTarget,
        current: baseCurrent,
        from: baseCurrent,
        knownBadIds: ["dpl_older_bad"],
        now,
        expiresAt,
        latestProbe: {
          ok: false,
          httpStatus: 500,
          latencyMs: 120,
          observedSha: "9f1c2e7222",
          error: "Internal Server Error",
        },
      });

      expect(checks).toHaveLength(6);
      const blocking = checks.filter((c) => c.blocking);
      expect(blocking.every((c) => c.ok)).toBe(true);
      const stillFailing = checks.find((c) => c.id === "still_failing");
      expect(stillFailing?.ok).toBe(true);
    });

    it("blocks if target is not READY", () => {
      const checks = evaluatePreflight({
        target: { ...baseTarget, state: "BUILDING" },
        current: baseCurrent,
        from: baseCurrent,
        knownBadIds: [],
        now: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      });

      const targetReady = checks.find((c) => c.id === "target_ready");
      expect(targetReady?.ok).toBe(false);
      expect(targetReady?.blocking).toBe(true);
    });

    it("blocks if target is identical to current deployment (target_differs)", () => {
      const checks = evaluatePreflight({
        target: baseCurrent,
        current: baseCurrent,
        from: baseCurrent,
        knownBadIds: [],
        now: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      });

      const targetDiffers = checks.find((c) => c.id === "target_differs");
      expect(targetDiffers?.ok).toBe(false);
      expect(targetDiffers?.blocking).toBe(true);
    });

    it("blocks if target is in knownBadIds", () => {
      const checks = evaluatePreflight({
        target: baseTarget,
        current: baseCurrent,
        from: baseCurrent,
        knownBadIds: [baseTarget.id],
        now: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      });

      const notKnownBad = checks.find((c) => c.id === "target_not_known_bad");
      expect(notKnownBad?.ok).toBe(false);
      expect(notKnownBad?.blocking).toBe(true);
    });

    it("blocks if production drifted since proposal (no_drift)", () => {
      const driftedCurrent: DeploymentRef = {
        ...baseCurrent,
        id: "dpl_newer_unknown",
      };

      const checks = evaluatePreflight({
        target: baseTarget,
        current: driftedCurrent,
        from: baseCurrent,
        knownBadIds: [],
        now: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      });

      const noDrift = checks.find((c) => c.id === "no_drift");
      expect(noDrift?.ok).toBe(false);
      expect(noDrift?.blocking).toBe(true);
    });

    it("blocks if expired (not_expired)", () => {
      const now = new Date("2026-10-17T11:21:00.000Z");
      const expiresAt = new Date("2026-10-17T11:20:00.000Z");

      const checks = evaluatePreflight({
        target: baseTarget,
        current: baseCurrent,
        from: baseCurrent,
        knownBadIds: [],
        now,
        expiresAt,
      });

      const notExpired = checks.find((c) => c.id === "not_expired");
      expect(notExpired?.ok).toBe(false);
      expect(notExpired?.blocking).toBe(true);
    });

    it("still_failing failing alone does NOT block execution", () => {
      const checks = evaluatePreflight({
        target: baseTarget,
        current: baseCurrent,
        from: baseCurrent,
        knownBadIds: [],
        now: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        latestProbe: {
          ok: true, // service looks healthy right now
          httpStatus: 200,
          latencyMs: 45,
          observedSha: baseCurrent.sha,
          error: null,
        },
      });

      const stillFailing = checks.find((c) => c.id === "still_failing");
      expect(stillFailing?.ok).toBe(false);
      expect(stillFailing?.blocking).toBe(false);

      const canExecute = checks.filter((c) => c.blocking).every((c) => c.ok);
      expect(canExecute).toBe(true);
    });
  });

  describe("approveAction security and state validation", () => {
    it("rejects MCP approve call if key lacks 'actions:approve' scope", async () => {
      const ctx = mcpCtx({
        keyId: "mck_123",
        workspaceId: "ws_test",
        name: "Read-only agent",
        scopes: ["incidents:read"], // lacks actions:approve
      });

      await expect(
        approveAction(ctx, "act_123", { via: "mcp" }),
      ).rejects.toThrowError(AppError);

      try {
        await approveAction(ctx, "act_123", { via: "mcp" });
      } catch (err) {
        const error = err as AppError;
        expect(error.status).toBe(403);
        expect(error.details?.reason).toBe("MISSING_SCOPE");
      }
    });

    it("rejects approve if action is expired", async () => {
      const ctx = userCtx("ws_test", "usr_123");

      // Mock database returning 0 rows on update and expired action on select
      const mockDb: any = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]), // CAS failed
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "act_123",
                  workspace_id: "ws_test",
                  incident_id: "inc_123",
                  status: "awaiting_approval",
                  expires_at: new Date(Date.now() - 10000), // expired!
                },
              ]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      await expect(
        approveAction(ctx, "act_123", { via: "web" }, mockDb),
      ).rejects.toThrowError(AppError);

      try {
        await approveAction(ctx, "act_123", { via: "web" }, mockDb);
      } catch (err) {
        const error = err as AppError;
        expect(error.status).toBe(412);
        expect(error.details?.reason).toBe("ACTION_EXPIRED");
      }
    });

    it("rejects approve if action is already executed or cancelled", async () => {
      const ctx = userCtx("ws_test", "usr_123");

      const mockDb: any = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]), // CAS failed
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "act_123",
                  workspace_id: "ws_test",
                  incident_id: "inc_123",
                  status: "executing", // already executing
                  expires_at: new Date(Date.now() + 60000),
                },
              ]),
            }),
          }),
        }),
      };

      try {
        await approveAction(ctx, "act_123", { via: "web" }, mockDb);
      } catch (err) {
        const error = err as AppError;
        expect(error.status).toBe(409);
        expect(error.details?.reason).toBe("INVALID_STATE");
        expect(error.details?.currentStatus).toBe("executing");
      }
    });
  });

  describe("Probe observedSha matching logic", () => {
    it("matches sha prefixes correctly", () => {
      const targetSha = "3ab9d04111222333444";
      const observed7 = "3ab9d04";
      const observedFull = "3ab9d04111222333444";
      const observedMismatch = "9f1c2e7";

      const match7 =
        observed7.startsWith(targetSha.slice(0, 7)) ||
        targetSha.startsWith(observed7);
      expect(match7).toBe(true);

      const matchFull =
        observedFull.startsWith(targetSha.slice(0, 7)) ||
        targetSha.startsWith(observedFull);
      expect(matchFull).toBe(true);

      const matchMismatch =
        observedMismatch.startsWith(targetSha.slice(0, 7)) ||
        targetSha.startsWith(observedMismatch);
      expect(matchMismatch).toBe(false);
    });
  });
});
