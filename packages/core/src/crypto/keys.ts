import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";

const base62Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const generateBase62 = customAlphabet(base62Alphabet, 43); // ~32 bytes entropy

export type GeneratedMcpKey = {
  key: string;
  prefix: string;
  hash: string;
};

/**
 * Hash an API key or token using SHA-256 hex.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/**
 * Generate a new MCP API key per doc 06 §2.13 and doc 03 §3.
 * Format: `fbk_` + base62 entropy (~43 chars).
 * Prefix: first 12 characters (`fbk_` + 8 chars).
 */
export function generateMcpKey(): GeneratedMcpKey {
  const randomPart = generateBase62();
  const key = `fbk_${randomPart}`;
  const prefix = key.slice(0, 12);
  const hash = hashKey(key);
  return { key, prefix, hash };
}

/**
 * Generate a new service alert signing secret per doc 03 §3 and doc 06 §4.
 * Format: `whsec_` + 32 random bytes base64url.
 */
export function generateAlertSecret(): string {
  const bytes = randomBytes(32);
  return `whsec_${bytes.toString("base64url")}`;
}
