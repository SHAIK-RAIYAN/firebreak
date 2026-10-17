import { describe, it, expect } from "vitest";
import { newId } from "../src/util/ids.js";
import { workspacesRepo } from "../src/repo/workspaces.js";

const testDbUrl = process.env.DATABASE_URL_TEST;

describe("workspaces", () => {
  it("generates correct workspace ID format", () => {
    const wsId = newId("ws");
    expect(wsId).toMatch(/^ws_[0-9a-z]{20}$/);
  });

  // Integration test: only runs if DATABASE_URL_TEST is provided
  it.skipIf(!testDbUrl)("bootstraps personal workspace idempotently", async () => {
    const testUserId = `test_user_${Date.now()}`;
    const ws1 = await workspacesRepo.bootstrapPersonalWorkspace(testUserId, "Test User");
    expect(ws1).toBeDefined();
    expect(ws1.owner_user_id).toBe(testUserId);
    expect(ws1.name).toBe("Test User's workspace");

    // Second bootstrap returns same workspace
    const ws2 = await workspacesRepo.bootstrapPersonalWorkspace(testUserId, "Test User");
    expect(ws2.id).toBe(ws1.id);

    // Sequence increment
    const seq1 = await workspacesRepo.nextIncidentNumber(ws1.id);
    expect(seq1).toBe(1);
    const seq2 = await workspacesRepo.nextIncidentNumber(ws1.id);
    expect(seq2).toBe(2);
  });
});
