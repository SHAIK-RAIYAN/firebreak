// @firebreak/core — main entry point
// Re-exports all public services, domain types, and utilities.
// This file is the root import for apps/web and apps/mcp.

// Utilities
export { newId } from "./util/ids.js";
export { requireEnv, optionalEnv } from "./util/env.js";
export { now, setMockClock } from "./util/time.js";
export { pMap } from "./util/pmap.js";
export { withRetry, type RetryOptions } from "./util/retry.js";
export { logger } from "./util/logger.js";

// Domain & Errors
export * from "./domain/errors.js";
export * from "./domain/state.js";
export * from "./domain/preflight.js";
export * from "./domain/ranking.js";

// Crypto
export * from "./crypto/secrets.js";
export * from "./crypto/hmac.js";
export * from "./crypto/keys.js";

// Database client & schema
export * from "./db/index.js";

// Repos
export * from "./repo/workspaces.js";
