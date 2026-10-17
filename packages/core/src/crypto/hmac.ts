import { createHmac, timingSafeEqual } from "node:crypto";
import { optionalEnv } from "../util/env.js";

/**
 * Sign alert body with HMAC-SHA256 per doc 06 §4.
 * Header format: `v1=<hex>`. Key is raw UTF-8 secret string including whsec_ prefix.
 */
export function signAlert(secret: string, timestamp: number, rawBody: string): string {
  const payload = `${timestamp}.${rawBody}`;
  const hmac = createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(payload, "utf8");
  const hex = hmac.digest("hex");
  return `v1=${hex}`;
}

export type VerifyAlertOptions = {
  secret: string;
  header: string | null | undefined;
  timestamp: number;
  rawBody: string;
  now?: number; // unix seconds
};

/**
 * Verify alert webhook signature and timestamp freshness.
 * Returns false (never throws) on malformed or invalid input.
 */
export function verifyAlertSignature(opts: VerifyAlertOptions): boolean {
  const { secret, header, timestamp, rawBody } = opts;
  if (!header || !secret || typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return false;
  }

  // Freshness check: reject if |now - ts| > 300 seconds (5 min)
  const currentNow = opts.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(currentNow - timestamp) > 300) {
    return false;
  }

  // Header format check
  if (!header.startsWith("v1=")) {
    return false;
  }
  const providedHex = header.slice(3);

  // Compute expected HMAC
  const payload = `${timestamp}.${rawBody}`;
  const hmac = createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(payload, "utf8");
  const expectedHex = hmac.digest("hex");

  // Constant-time comparison on equal-length buffers
  const bufProvided = Buffer.from(providedHex, "hex");
  const bufExpected = Buffer.from(expectedHex, "hex");

  if (bufProvided.length !== bufExpected.length || bufProvided.length !== 32) {
    return false;
  }

  return timingSafeEqual(bufProvided, bufExpected);
}

/**
 * Verify GitHub webhook signature (sha256=<hex>).
 */
export function verifyGithubSignature(
  secret: string,
  header: string | null | undefined,
  rawBody: string,
): boolean {
  if (!header || !secret || !header.startsWith("sha256=")) {
    return false;
  }

  const providedHex = header.slice(7);
  const hmac = createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(rawBody, "utf8");
  const expectedHex = hmac.digest("hex");

  const bufProvided = Buffer.from(providedHex, "hex");
  const bufExpected = Buffer.from(expectedHex, "hex");

  if (bufProvided.length !== bufExpected.length || bufProvided.length !== 32) {
    return false;
  }

  return timingSafeEqual(bufProvided, bufExpected);
}

/**
 * Generate a signed URL-safe state token for OAuth flows.
 */
export function signState(obj: Record<string, unknown>, customSecret?: string): string {
  const secret = customSecret || optionalEnv("STATE_SECRET", "default-state-secret-32-chars-at-least!");
  const json = JSON.stringify(obj);
  const dataB64 = Buffer.from(json, "utf8").toString("base64url");
  const hmac = createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(dataB64, "utf8");
  const sig = hmac.digest("base64url");
  return `${dataB64}.${sig}`;
}

/**
 * Verify and parse a signed state token.
 * Returns payload object or null if tampered or expired.
 */
export function verifyState<T = Record<string, unknown>>(
  token: string | null | undefined,
  customSecret?: string,
): T | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [dataB64, providedSig] = parts;
  if (!dataB64 || !providedSig) {
    return null;
  }

  const secret = customSecret || optionalEnv("STATE_SECRET", "default-state-secret-32-chars-at-least!");
  const hmac = createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(dataB64, "utf8");
  const expectedSig = hmac.digest("base64url");

  const bufProvided = Buffer.from(providedSig);
  const bufExpected = Buffer.from(expectedSig);

  if (bufProvided.length !== bufExpected.length) {
    return null;
  }

  if (!timingSafeEqual(bufProvided, bufExpected)) {
    return null;
  }

  try {
    const json = Buffer.from(dataB64, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as T & { exp?: number };
    if (typeof parsed?.exp === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec > parsed.exp) {
        return null; // Expired
      }
    }
    return parsed;
  } catch {
    return null;
  }
}
