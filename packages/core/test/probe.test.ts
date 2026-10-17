import { describe, it, expect, vi, afterEach } from "vitest";
import { probe } from "../src/adapters/probe.js";

describe("Probe adapter (probe)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok: true and extracts sha from valid JSON response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, sha: "abc1234567890" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await probe("https://example.com/api/health", { expectedStatus: 200 });
    expect(res.ok).toBe(true);
    expect(res.httpStatus).toBe(200);
    expect(res.observedSha).toBe("abc1234567890");
    expect(res.error).toBeNull();
    expect(typeof res.latencyMs).toBe("number");
  });

  it("handles non-JSON response gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("OK plain text", {
        status: 200,
      }),
    );

    const res = await probe("https://example.com/api/health");
    expect(res.ok).toBe(true);
    expect(res.httpStatus).toBe(200);
    expect(res.observedSha).toBeNull();
    expect(res.error).toBeNull();
  });

  it("returns ok: false when status does not match expectedStatus", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Broken" }), {
        status: 500,
      }),
    );

    const res = await probe("https://example.com/api/health", { expectedStatus: 200 });
    expect(res.ok).toBe(false);
    expect(res.httpStatus).toBe(500);
    expect(res.error).toBeNull();
  });

  it("catches timeout/abort errors and returns error: 'timeout' without throwing", async () => {
    const abortErr = new Error("The operation was aborted due to timeout");
    abortErr.name = "TimeoutError";
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortErr);

    const res = await probe("https://example.com/api/health", { timeoutMs: 1000 });
    expect(res.ok).toBe(false);
    expect(res.httpStatus).toBeNull();
    expect(res.error).toBe("timeout");
  });

  it("catches network errors without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("fetch failed: ECONNREFUSED"));

    const res = await probe("https://example.com/api/health");
    expect(res.ok).toBe(false);
    expect(res.httpStatus).toBeNull();
    expect(res.error).toBe("network");
  });
});
