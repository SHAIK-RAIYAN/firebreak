import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireEnv, optionalEnv } from "../util/env.js";

export type Sealed = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

let cachedKey: Buffer | null = null;
let cachedPrevKey: Buffer | null = null;

function getMasterKeys(): { current: Buffer; previous: Buffer | null } {
  if (!cachedKey) {
    const raw = requireEnv("ENCRYPTION_KEY");
    const keyBuf = Buffer.from(raw, "base64");
    if (keyBuf.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be a 32-byte base64-encoded string");
    }
    cachedKey = keyBuf;

    const prevRaw = optionalEnv("ENCRYPTION_KEY_PREVIOUS", "");
    if (prevRaw) {
      const prevBuf = Buffer.from(prevRaw, "base64");
      if (prevBuf.length === 32) {
        cachedPrevKey = prevBuf;
      }
    }
  }
  return { current: cachedKey, previous: cachedPrevKey };
}

/**
 * Encrypt plaintext using AES-256-GCM with explicit key and AAD.
 */
export function seal(
  plaintext: string,
  aad: string,
  key: Buffer,
  keyVersion = 1,
): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ct.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

/**
 * Decrypt sealed secret using AES-256-GCM with explicit key and AAD.
 */
export function open(s: Sealed, aad: string, key: Buffer): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(s.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(s.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(s.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Encrypt using the lazily loaded master ENCRYPTION_KEY.
 */
export function sealWith(aad: string, plaintext: string): Sealed {
  const { current } = getMasterKeys();
  return seal(plaintext, aad, current, 1);
}

/**
 * Decrypt using the lazily loaded master key (or previous key during rotation).
 */
export function openWith(aad: string, sealed: Sealed): string {
  const { current, previous } = getMasterKeys();
  try {
    return open(sealed, aad, current);
  } catch (err) {
    if (previous) {
      return open(sealed, aad, previous);
    }
    throw err;
  }
}
