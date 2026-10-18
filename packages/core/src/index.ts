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
export * from "./crypto/scrub.js";

// Adapters
export * from "./adapters/ssrf.js";
export * from "./adapters/probe.js";
export * from "./adapters/vercel.js";
export {
  githubApp,
  setGithubApp,
  githubForInstallation,
  verifyInstallation,
  type RepoRef,
  type CommitRef,
  type CompareResult,
  type VerifiedInstallation,
} from "./adapters/github.js";

// Services & Context
export * from "./services/context.js";
export * from "./services/integrations.js";
export * from "./services/services.js";
export * from "./services/mcpKeys.js";
export * from "./services/timeline.js";
export * from "./services/alerts.js";
export * from "./services/trace.js";
export * from "./services/actions.js";
export * from "./services/ai.js";

// Inngest
export * from "./inngest/index.js";

// Database client & schema
export { db, type Database } from "./db/client.js";
export * from "./db/schema.js";
export * as schema from "./db/schema.js";

// Views & DTOs
export * from "./views/types.js";

// AI
export * from "./ai/index.js";

// Email & Notifications
export * from "./email/index.js";

// Repos
export * from "./repo/workspaces.js";

