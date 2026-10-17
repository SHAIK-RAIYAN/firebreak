import { describe, it, expect } from "vitest";
import {
  AlertPayloadSchema,
  ingestAlert,
  scrubSecrets,
  signAlert,
} from "../src/index.js";

describe("Alert intake and validation", () => {
  describe("AlertPayloadSchema", () => {
    it("validates a compliant alert payload", () => {
      const payload = {
        fingerprint: "health:TypeError:applyDiscount",
        title: "Health check failing: TypeError",
        severity: "critical",
        source: "fixture",
        occurredAt: "2026-10-17T12:00:00.000Z",
        error: {
          type: "TypeError",
          message: "Cannot read properties of undefined (reading 'reduce')",
          frames: [
            {
              file: "/var/task/.next/server/chunks/123.js",
              line: 1,
              function: "applyDiscount",
              source: "stack",
            },
            {
              file: "lib/pricing.ts",
              line: null,
              function: "applyDiscount",
              source: "hint",
            },
          ],
        },
        observed: {
          url: "https://demo.example.com/api/health",
          status: 500,
          sha: "9f1c2e7b8a",
        },
      };

      const result = AlertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fingerprint).toBe("health:TypeError:applyDiscount");
        expect(result.data.severity).toBe("critical");
        expect(result.data.error.frames).toHaveLength(2);
      }
    });

    it("rejects invalid severity", () => {
      const payload = {
        fingerprint: "err:1",
        title: "Error",
        severity: "extreme", // invalid
      };
      const result = AlertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("defaults severity to high and frames to empty array", () => {
      const payload = {
        fingerprint: "err:1",
        title: "Error",
      };
      const result = AlertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBe("high");
        expect(result.data.error.frames).toEqual([]);
      }
    });
  });

  describe("ingestAlert validation & headers", () => {
    it("rejects payload > 64 KB with PAYLOAD_TOO_LARGE", async () => {
      const largeBody = "x".repeat(65 * 1024);
      await expect(
        ingestAlert({
          serviceId: "svc_test",
          rawBody: largeBody,
          headers: {
            "x-firebreak-timestamp": String(Math.floor(Date.now() / 1000)),
            "x-firebreak-signature": "v1=abcdef",
          },
        }),
      ).rejects.toMatchObject({
        code: "PAYLOAD_TOO_LARGE",
        status: 413,
      });
    });

    it("rejects missing headers with INVALID_SIGNATURE", async () => {
      await expect(
        ingestAlert({
          serviceId: "svc_test",
          rawBody: "{}",
          headers: {},
        }),
      ).rejects.toMatchObject({
        code: "INVALID_SIGNATURE",
        status: 401,
      });
    });

    it("rejects timestamp drift > 300s with INVALID_SIGNATURE", async () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - 301;
      await expect(
        ingestAlert({
          serviceId: "svc_test",
          rawBody: "{}",
          headers: {
            "x-firebreak-timestamp": String(staleTimestamp),
            "x-firebreak-signature": "v1=abcdef",
          },
        }),
      ).rejects.toMatchObject({
        code: "INVALID_SIGNATURE",
        status: 401,
      });
    });
  });

  describe("Secret scrubber (scrubSecrets)", () => {
    it("scrubs OpenAI keys, GitHub tokens, Slack tokens, and AWS keys", () => {
      const text = `
        sk-1234567890abcdef1234567890abcdef
        ghp_abcdefghijklmnopqrstuvwxyz123456
        xoxb-1234567890-1234567890123-abcdefghijklmnop
        AKIAIOSFODNN7EXAMPLE
        whsec_abcdefghijklmnopqrstuvwxyz123456
      `;

      const scrubbed = scrubSecrets(text);
      expect(scrubbed).not.toContain("sk-1234567890abcdef1234567890abcdef");
      expect(scrubbed).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
      expect(scrubbed).not.toContain("xoxb-1234567890-1234567890123-abcdefghijklmnop");
      expect(scrubbed).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(scrubbed).not.toContain("whsec_abcdefghijklmnopqrstuvwxyz123456");
      expect(scrubbed).toContain("[redacted]");
    });

    it("scrubs .env style secret lines", () => {
      const text = `
        DATABASE_URL=postgres://localhost/db
        API_SECRET="super-secret-value"
        GITHUB_TOKEN=ghp_123456789012345678901234567890123456
        ENCRYPTION_KEY='another-secret'
        REGULAR_CONFIG=normal-value
      `;

      const scrubbed = scrubSecrets(text);
      expect(scrubbed).toContain("DATABASE_URL=postgres://localhost/db");
      expect(scrubbed).toContain("REGULAR_CONFIG=normal-value");
      expect(scrubbed).not.toContain("super-secret-value");
      expect(scrubbed).not.toContain("another-secret");
      expect(scrubbed).toContain('API_SECRET="[redacted]"');
      expect(scrubbed).toContain("ENCRYPTION_KEY='[redacted]'");
    });
  });

  describe("Service lookup & signature verification", () => {
    it("rejects unknown service with NOT_FOUND after constant-time check", async () => {
      const mockDb: any = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      };

      const ts = Math.floor(Date.now() / 1000);
      await expect(
        ingestAlert({
          serviceId: "svc_nonexistent",
          rawBody: JSON.stringify({ fingerprint: "test", title: "Test" }),
          headers: {
            "x-firebreak-timestamp": String(ts),
            "x-firebreak-signature": "v1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          },
          db: mockDb,
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
    });
  });
});
