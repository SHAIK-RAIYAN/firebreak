import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { seal, open } from "../src/crypto/secrets.js";
import {
  signAlert,
  verifyAlertSignature,
  verifyGithubSignature,
  signState,
  verifyState,
} from "../src/crypto/hmac.js";
import { generateMcpKey, hashKey, generateAlertSecret } from "../src/crypto/keys.js";

describe("crypto utilities", () => {
  describe("AES-256-GCM secrets (doc 07 §3.2)", () => {
    const key = randomBytes(32);
    const wrongKey = randomBytes(32);
    const aad = "ws_test:vercel";
    const plaintext = "vcp_secret_token_12345";

    // Case 1: Round-trip
    it("round-trips plaintext with correct key and AAD", () => {
      const sealed = seal(plaintext, aad, key);
      const decrypted = open(sealed, aad, key);
      expect(decrypted).toBe(plaintext);
    });

    // Case 2: Wrong AAD throws
    it("throws when decrypted with wrong AAD", () => {
      const sealed = seal(plaintext, aad, key);
      expect(() => open(sealed, "ws_other:vercel", key)).toThrow();
    });

    // Case 3: Tampered ciphertext throws
    it("throws when ciphertext is tampered", () => {
      const sealed = seal(plaintext, aad, key);
      const tamperedBuf = Buffer.from(sealed.ciphertext, "base64");
      tamperedBuf[0] = tamperedBuf[0]! ^ 0xff;
      const tamperedSealed = {
        ...sealed,
        ciphertext: tamperedBuf.toString("base64"),
      };
      expect(() => open(tamperedSealed, aad, key)).toThrow();
    });

    // Case 4: Tampered auth tag throws
    it("throws when authTag is tampered", () => {
      const sealed = seal(plaintext, aad, key);
      const tamperedTag = Buffer.from(sealed.authTag, "base64");
      tamperedTag[0] = tamperedTag[0]! ^ 0xff;
      const tamperedSealed = {
        ...sealed,
        authTag: tamperedTag.toString("base64"),
      };
      expect(() => open(tamperedSealed, aad, key)).toThrow();
    });

    // Case 5: Wrong key throws
    it("throws when decrypted with wrong key", () => {
      const sealed = seal(plaintext, aad, key);
      expect(() => open(sealed, aad, wrongKey)).toThrow();
    });
  });

  describe("HMAC alert verification (doc 06 §4 and doc 14 §2 item 4)", () => {
    const secret = "whsec_abcdef1234567890abcdef1234567890";
    const wrongSecret = "whsec_wrongwrongwrongwrongwrongwrong12";
    const nowSec = 1700000000;
    const rawBody = JSON.stringify({ title: "High error rate", fingerprint: "fp_1" });

    it("verifies valid signature with matching secret and fresh timestamp", () => {
      const header = signAlert(secret, nowSec, rawBody);
      const valid = verifyAlertSignature({
        secret,
        header,
        timestamp: nowSec,
        rawBody,
        now: nowSec,
      });
      expect(valid).toBe(true);
    });

    it("rejects wrong secret", () => {
      const header = signAlert(secret, nowSec, rawBody);
      const valid = verifyAlertSignature({
        secret: wrongSecret,
        header,
        timestamp: nowSec,
        rawBody,
        now: nowSec,
      });
      expect(valid).toBe(false);
    });

    it("rejects timestamp 301 seconds in the past", () => {
      const ts = nowSec - 301;
      const header = signAlert(secret, ts, rawBody);
      const valid = verifyAlertSignature({
        secret,
        header,
        timestamp: ts,
        rawBody,
        now: nowSec,
      });
      expect(valid).toBe(false);
    });

    it("rejects timestamp 301 seconds in the future", () => {
      const ts = nowSec + 301;
      const header = signAlert(secret, ts, rawBody);
      const valid = verifyAlertSignature({
        secret,
        header,
        timestamp: ts,
        rawBody,
        now: nowSec,
      });
      expect(valid).toBe(false);
    });

    it("rejects header without v1= prefix", () => {
      const header = signAlert(secret, nowSec, rawBody);
      const withoutV1 = header.slice(3); // Just hex
      const valid = verifyAlertSignature({
        secret,
        header: withoutV1,
        timestamp: nowSec,
        rawBody,
        now: nowSec,
      });
      expect(valid).toBe(false);
    });

    it("rejects hex of wrong length", () => {
      const header = "v1=abcd1234";
      const valid = verifyAlertSignature({
        secret,
        header,
        timestamp: nowSec,
        rawBody,
        now: nowSec,
      });
      expect(valid).toBe(false);
    });

    it("rejects when rawBody is modified by 1 byte", () => {
      const header = signAlert(secret, nowSec, rawBody);
      const tamperedBody = rawBody + " ";
      const valid = verifyAlertSignature({
        secret,
        header,
        timestamp: nowSec,
        rawBody: tamperedBody,
        now: nowSec,
      });
      expect(valid).toBe(false);
    });
  });

  describe("GitHub webhook HMAC signature", () => {
    it("verifies sha256=<hex> signature", () => {
      const secret = "test_webhook_secret";
      const body = '{"action":"created"}';
      const validHeader =
        "sha256=" +
        require("node:crypto")
          .createHmac("sha256", secret)
          .update(body, "utf8")
          .digest("hex");

      expect(verifyGithubSignature(secret, validHeader, body)).toBe(true);
      expect(verifyGithubSignature("wrong", validHeader, body)).toBe(false);
      expect(verifyGithubSignature(secret, "bad_header", body)).toBe(false);
    });
  });

  describe("State tokens (signState / verifyState)", () => {
    const secret = "test_state_secret_32_bytes_length!!";
    const payload = { ws: "ws_123", nonce: "nonce_456", exp: Math.floor(Date.now() / 1000) + 600 };

    it("signs and verifies state tokens round-trip", () => {
      const token = signState(payload, secret);
      const recovered = verifyState<typeof payload>(token, secret);
      expect(recovered).not.toBeNull();
      expect(recovered?.ws).toBe("ws_123");
      expect(recovered?.nonce).toBe("nonce_456");
    });

    it("rejects expired state tokens", () => {
      const expiredPayload = { ws: "ws_123", exp: Math.floor(Date.now() / 1000) - 10 };
      const token = signState(expiredPayload, secret);
      const recovered = verifyState(token, secret);
      expect(recovered).toBeNull();
    });

    it("rejects tampered state tokens", () => {
      const token = signState(payload, secret);
      const tampered = token.slice(0, -4) + "aaaa";
      expect(verifyState(tampered, secret)).toBeNull();
    });
  });

  describe("Keys generation", () => {
    it("generates MCP key with correct fbk_ prefix and hash", () => {
      const { key, prefix, hash } = generateMcpKey();
      expect(key.startsWith("fbk_")).toBe(true);
      expect(prefix).toBe(key.slice(0, 12));
      expect(hash).toBe(hashKey(key));
    });

    it("generates alert secret with whsec_ prefix", () => {
      const secret = generateAlertSecret();
      expect(secret.startsWith("whsec_")).toBe(true);
    });
  });
});
