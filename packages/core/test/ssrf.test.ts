import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateHealthUrl } from "../src/adapters/ssrf.js";
import { AppError } from "../src/domain/errors.js";

describe("SSRF guard (validateHealthUrl)", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("accepts a valid public https URL", async () => {
    const url = await validateHealthUrl("https://example.com/api/health");
    expect(url.hostname).toBe("example.com");
  });

  it("blocks invalid URL format", async () => {
    await expect(validateHealthUrl("not a url")).rejects.toThrow(AppError);
  });

  it("blocks non-http/https protocols", async () => {
    await expect(validateHealthUrl("ftp://example.com/api/health")).rejects.toThrow(AppError);
    await expect(validateHealthUrl("file:///etc/passwd")).rejects.toThrow(AppError);
  });

  it("blocks http in production", async () => {
    process.env.NODE_ENV = "production";
    await expect(validateHealthUrl("http://example.com/api/health")).rejects.toThrow(AppError);
  });

  it("allows http when explicitly permitted in dev", async () => {
    process.env.NODE_ENV = "development";
    const url = await validateHealthUrl("http://example.com/api/health", { allowHttp: true });
    expect(url.protocol).toBe("http:");
  });

  it("blocks loopback IP literals (127.0.0.1, ::1)", async () => {
    await expect(validateHealthUrl("http://127.0.0.1/api/health", { allowHttp: true })).rejects.toThrow(AppError);
    await expect(validateHealthUrl("http://[::1]/api/health", { allowHttp: true })).rejects.toThrow(AppError);
  });

  it("blocks private IPv4 literals (10.x, 192.168.x, 172.16.x)", async () => {
    await expect(validateHealthUrl("http://10.0.0.1/health", { allowHttp: true })).rejects.toThrow(AppError);
    await expect(validateHealthUrl("http://192.168.1.1/health", { allowHttp: true })).rejects.toThrow(AppError);
    await expect(validateHealthUrl("http://172.16.0.1/health", { allowHttp: true })).rejects.toThrow(AppError);
  });

  it("blocks link-local and cloud metadata IPs (169.254.169.254)", async () => {
    await expect(validateHealthUrl("http://169.254.169.254/latest/meta-data/", { allowHttp: true })).rejects.toThrow(AppError);
  });

  it("blocks localhost in production", async () => {
    process.env.NODE_ENV = "production";
    await expect(validateHealthUrl("https://localhost/api/health")).rejects.toThrow(AppError);
  });
});
