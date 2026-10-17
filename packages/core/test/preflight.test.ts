import { describe, it, expect } from "vitest";
import { evaluatePreflight, canExecute } from "../src/domain/preflight.js";
import type { DeploymentRef } from "../src/db/schema.js";

const mockCurrent: DeploymentRef = {
  id: "dpl_bad_123",
  url: "https://demo-bad.vercel.app",
  sha: "bad_sha_111",
  createdAt: "2026-10-17T11:00:00Z",
  state: "READY",
  branch: "main",
};

const mockTarget: DeploymentRef = {
  id: "dpl_good_456",
  url: "https://demo-good.vercel.app",
  sha: "good_sha_222",
  createdAt: "2026-10-17T09:00:00Z",
  state: "READY",
  branch: "main",
};

describe("evaluatePreflight", () => {
  const baseInput = {
    target: mockTarget,
    current: mockCurrent,
    from: mockCurrent,
    knownBadIds: [],
    now: new Date("2026-10-17T11:05:00Z"),
    expiresAt: new Date("2026-10-17T11:20:00Z"),
    latestProbe: { ok: false, httpStatus: 500 }, // Service is failing
  };

  it("passes all checks when all conditions are healthy", () => {
    const checks = evaluatePreflight(baseInput);
    expect(checks.length).toBe(6);
    expect(canExecute(checks)).toBe(true);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it("blocks when target is not READY (target_ready)", () => {
    const checks = evaluatePreflight({
      ...baseInput,
      target: { ...mockTarget, state: "BUILDING" },
    });
    const failedCheck = checks.find((c) => c.id === "target_ready");
    expect(failedCheck?.ok).toBe(false);
    expect(failedCheck?.blocking).toBe(true);
    expect(canExecute(checks)).toBe(false);
  });

  it("blocks when target is identical to current (target_differs)", () => {
    const checks = evaluatePreflight({
      ...baseInput,
      target: mockCurrent,
    });
    const failedCheck = checks.find((c) => c.id === "target_differs");
    expect(failedCheck?.ok).toBe(false);
    expect(failedCheck?.blocking).toBe(true);
    expect(canExecute(checks)).toBe(false);
  });

  it("blocks when target is known-bad (target_not_known_bad)", () => {
    const checks = evaluatePreflight({
      ...baseInput,
      knownBadIds: [mockTarget.id],
    });
    const failedCheck = checks.find((c) => c.id === "target_not_known_bad");
    expect(failedCheck?.ok).toBe(false);
    expect(failedCheck?.blocking).toBe(true);
    expect(canExecute(checks)).toBe(false);
  });

  it("blocks when production drifted since proposal (no_drift)", () => {
    const driftedCurrent: DeploymentRef = {
      ...mockCurrent,
      id: "dpl_drifted_999",
      sha: "drifted_sha_999",
    };
    const checks = evaluatePreflight({
      ...baseInput,
      current: driftedCurrent,
      from: mockCurrent,
    });
    const failedCheck = checks.find((c) => c.id === "no_drift");
    expect(failedCheck?.ok).toBe(false);
    expect(failedCheck?.blocking).toBe(true);
    expect(canExecute(checks)).toBe(false);
  });

  it("blocks when proposal is expired (not_expired)", () => {
    const checks = evaluatePreflight({
      ...baseInput,
      now: new Date("2026-10-17T11:25:00Z"), // Past expiresAt
    });
    const failedCheck = checks.find((c) => c.id === "not_expired");
    expect(failedCheck?.ok).toBe(false);
    expect(failedCheck?.blocking).toBe(true);
    expect(canExecute(checks)).toBe(false);
  });

  it("warns but DOES NOT BLOCK when service looks healthy (still_failing)", () => {
    const checks = evaluatePreflight({
      ...baseInput,
      latestProbe: { ok: true, httpStatus: 200 }, // Service recovered
    });
    const failingCheck = checks.find((c) => c.id === "still_failing");
    expect(failingCheck?.ok).toBe(false);
    expect(failingCheck?.blocking).toBe(false);
    // Still can execute because still_failing is non-blocking!
    expect(canExecute(checks)).toBe(true);
  });
});
