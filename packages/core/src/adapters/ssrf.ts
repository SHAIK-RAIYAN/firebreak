import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { AppError } from "../domain/errors.js";

const BLOCKED_IPV4_RANGES = new Set([
  "unspecified",
  "broadcast",
  "linkLocal",
  "loopback",
  "carrierGradeNat",
  "private",
  "reserved",
]);

const BLOCKED_IPV6_RANGES = new Set([
  "unspecified",
  "linkLocal",
  "loopback",
  "uniqueLocal",
  "reserved",
  "rfc6145",
  "rfc6052",
  "6to4",
  "teredo",
]);

function isPrivateIp(ipStr: string): boolean {
  if (!ipaddr.isValid(ipStr)) {
    return true; // Malformed IP is blocked
  }

  const parsed = ipaddr.parse(ipStr);

  if (parsed.kind() === "ipv4") {
    return BLOCKED_IPV4_RANGES.has(parsed.range());
  }

  if (parsed.kind() === "ipv6") {
    const ipv6 = parsed as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) {
      const ipv4 = ipv6.toIPv4Address();
      return BLOCKED_IPV4_RANGES.has(ipv4.range());
    }
    return BLOCKED_IPV6_RANGES.has(ipv6.range());
  }

  return true;
}

export interface ValidateUrlOptions {
  allowHttp?: boolean;
}

/**
 * Validates a health check URL against SSRF rules:
 * - Must be a valid URL with protocol http/https
 * - In production, must be https (unless allowHttp is explicitly true)
 * - Must not resolve to loopback, private, link-local, or reserved IP ranges
 */
export async function validateHealthUrl(
  rawUrl: string,
  opts: ValidateUrlOptions = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError("VALIDATION_FAILED", "Invalid URL format", {
      reason: "SSRF_BLOCKED",
    });
  }

  const isProd = process.env.NODE_ENV === "production";
  const allowHttp = opts.allowHttp ?? !isProd;

  if (parsed.protocol === "http:" && !allowHttp) {
    throw new AppError("PRECONDITION_FAILED", "HTTPS is required for health check URLs in production", {
      reason: "SSRF_BLOCKED",
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError("PRECONDITION_FAILED", "Only HTTP and HTTPS protocols are supported", {
      reason: "SSRF_BLOCKED",
    });
  }

  const hostname = parsed.hostname;

  // Block localhost or empty hostname in production
  if (isProd && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")) {
    throw new AppError("PRECONDITION_FAILED", "Localhost is not allowed in production", {
      reason: "SSRF_BLOCKED",
    });
  }

  // If hostname is directly an IP literal
  if (ipaddr.isValid(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new AppError("PRECONDITION_FAILED", "URL points to a private or disallowed IP address", {
        reason: "SSRF_BLOCKED",
      });
    }
    return parsed;
  }

  // Resolve hostname via DNS
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new AppError("UPSTREAM_ERROR", `Could not resolve hostname: ${hostname}`, {
        reason: "SSRF_BLOCKED",
      });
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new AppError("PRECONDITION_FAILED", `URL hostname ${hostname} resolves to a private IP: ${record.address}`, {
          reason: "SSRF_BLOCKED",
        });
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("UPSTREAM_ERROR", `DNS resolution failed for ${hostname}: ${(err as Error).message}`, {
      reason: "SSRF_BLOCKED",
    });
  }

  return parsed;
}
