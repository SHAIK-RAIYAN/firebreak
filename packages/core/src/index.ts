// @firebreak/core — main entry point
// Re-exports all public services, domain types, and utilities.
// This file is the root import for apps/web and apps/mcp.

export { newId } from "./util/ids.js";
export { requireEnv, optionalEnv } from "./util/env.js";

// Database client & schema
export * from "./db/index.js";

// Repos
export * from "./repo/workspaces.js";
