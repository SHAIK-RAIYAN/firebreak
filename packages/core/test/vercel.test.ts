import { describe, it, expect, vi, afterEach } from "vitest";
import { vercelClient, type DeploymentRef } from "../src/adapters/vercel.js";
import { AppError } from "../src/domain/errors.js";

describe("Vercel adapter (vercelClient)", () => {
  const client = vercelClient({ token: "test-token" });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentProduction algorithm (all 3 branches)", () => {
    it("Branch 1: uses targets.production.id when present", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v9/projects/prj_123")) {
          return new Response(
            JSON.stringify({
              id: "prj_123",
              name: "my-app",
              targets: {
                production: { id: "dpl_target_prod" },
              },
            }),
            { status: 200 },
          );
        }
        if (urlStr.includes("/v13/deployments/dpl_target_prod")) {
          return new Response(
            JSON.stringify({
              id: "dpl_target_prod",
              url: "my-app.vercel.app",
              readyState: "READY",
              created: 1700000000000,
              meta: { githubCommitSha: "sha_branch_1" },
            }),
            { status: 200 },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const current = await client.getCurrentProduction("prj_123");
      expect(current.id).toBe("dpl_target_prod");
      expect(current.sha).toBe("sha_branch_1");
    });

    it("Branch 2: uses lastAliasRequest.toDeploymentId when succeeded and targets.production is absent", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v9/projects/prj_123")) {
          return new Response(
            JSON.stringify({
              id: "prj_123",
              name: "my-app",
              targets: {},
              lastAliasRequest: {
                type: "rollback",
                jobStatus: "succeeded",
                toDeploymentId: "dpl_alias_target",
              },
            }),
            { status: 200 },
          );
        }
        if (urlStr.includes("/v13/deployments/dpl_alias_target")) {
          return new Response(
            JSON.stringify({
              id: "dpl_alias_target",
              url: "my-app.vercel.app",
              readyState: "READY",
              created: 1700000000000,
              meta: { githubCommitSha: "sha_branch_2" },
            }),
            { status: 200 },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const current = await client.getCurrentProduction("prj_123");
      expect(current.id).toBe("dpl_alias_target");
      expect(current.sha).toBe("sha_branch_2");
    });

    it("Branch 3: falls back to newest ready production deployment", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v9/projects/prj_123")) {
          return new Response(
            JSON.stringify({
              id: "prj_123",
              name: "my-app",
              targets: {},
              lastAliasRequest: null,
            }),
            { status: 200 },
          );
        }
        if (urlStr.includes("/v7/deployments")) {
          return new Response(
            JSON.stringify({
              deployments: [
                {
                  uid: "dpl_newest_ready",
                  url: "my-app.vercel.app",
                  readyState: "READY",
                  created: 1700000000000,
                  meta: { githubCommitSha: "sha_branch_3" },
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const current = await client.getCurrentProduction("prj_123");
      expect(current.id).toBe("dpl_newest_ready");
      expect(current.sha).toBe("sha_branch_3");
    });
  });

  describe("getRollbackTarget", () => {
    const badDep: DeploymentRef = {
      id: "dpl_bad",
      url: "https://my-app.vercel.app",
      sha: "sha_bad_123",
      createdAt: new Date(1700000000000).toISOString(),
      created: 1700000000000,
      state: "READY",
      branch: "main",
    };

    it("finds earlier deployment with different sha and skips known-bad", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v7/deployments")) {
          return new Response(
            JSON.stringify({
              deployments: [
                // Newer than bad: skip
                { uid: "dpl_newer", url: "...", readyState: "READY", created: 1700000050000, meta: { githubCommitSha: "sha_newer" } },
                // Same sha as bad: skip
                { uid: "dpl_same_sha", url: "...", readyState: "READY", created: 1699999000000, meta: { githubCommitSha: "sha_bad_123" } },
                // In known bad list: skip
                { uid: "dpl_known_bad", url: "...", readyState: "READY", created: 1699998000000, meta: { githubCommitSha: "sha_earlier_bad" } },
                // Good rollback target!
                { uid: "dpl_good_target", url: "...", readyState: "READY", created: 1699997000000, meta: { githubCommitSha: "sha_good" } },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const target = await client.getRollbackTarget("prj_123", badDep, ["dpl_known_bad"]);
      expect(target).not.toBeNull();
      expect(target?.id).toBe("dpl_good_target");
      expect(target?.sha).toBe("sha_good");
    });

    it("returns null when no eligible earlier deployment exists", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/v7/deployments")) {
          return new Response(
            JSON.stringify({
              deployments: [],
            }),
            { status: 200 },
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const target = await client.getRollbackTarget("prj_123", badDep);
      expect(target).toBeNull();
    });
  });

  describe("Error mapping", () => {
    it("maps 401/403 to VERCEL_UNAUTHORIZED", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 401 }),
      );

      await expect(client.getUser()).rejects.toSatisfy((err: any) => {
        return err instanceof AppError && err.code === "UPSTREAM_ERROR" && err.details?.reason === "VERCEL_UNAUTHORIZED";
      });
    });

    it("maps 402 to VERCEL_PLAN_LIMIT", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Payment required" } }), { status: 402 }),
      );

      await expect(client.getUser()).rejects.toSatisfy((err: any) => {
        return err instanceof AppError && err.code === "UPSTREAM_ERROR" && err.details?.reason === "VERCEL_PLAN_LIMIT";
      });
    });

    it("maps 404 to VERCEL_NOT_FOUND", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 }),
      );

      await expect(client.getProject("prj_missing")).rejects.toSatisfy((err: any) => {
        return err instanceof AppError && err.code === "NOT_FOUND" && err.details?.reason === "VERCEL_NOT_FOUND";
      });
    });

    it("maps 409 to VERCEL_CONFLICT", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Conflict" } }), { status: 409 }),
      );

      await expect(client.promote("prj_123", "dpl_123")).rejects.toSatisfy((err: any) => {
        return err instanceof AppError && err.code === "CONFLICT" && err.details?.reason === "VERCEL_CONFLICT";
      });
    });

    it("maps 422 to VERCEL_REJECTED", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Unprocessable" } }), { status: 422 }),
      );

      await expect(client.promote("prj_123", "dpl_123")).rejects.toSatisfy((err: any) => {
        return err instanceof AppError && err.code === "UPSTREAM_ERROR" && err.details?.reason === "VERCEL_REJECTED";
      });
    });
  });

  describe("Rollback", () => {
    it("never retries automatically", async () => {
      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        return new Response(JSON.stringify({ error: { message: "Unavailable" } }), { status: 503 });
      });

      await expect(client.rollback("prj_123", "dpl_target")).rejects.toThrow();
      expect(callCount).toBe(1); // Exactly 1 call, never retried!
    });
  });
});
