import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { mcp_api_keys } from "../db/schema.js";
import { newId } from "../util/ids.js";
import { generateMcpKey, hashKey } from "../crypto/keys.js";
import { AppError } from "../domain/errors.js";
import type { ServiceContext, Identity } from "./context.js";

export interface CreateMcpKeyInput {
  name: string;
  scopes?: string[];
}

export interface McpKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export async function createMcpKey(
  ctx: ServiceContext,
  input: CreateMcpKeyInput,
): Promise<{ key: string; record: McpKeyRecord }> {
  const name = input.name.trim();
  if (!name) {
    throw new AppError("VALIDATION_FAILED", "Key name is required", {
      reason: "VALIDATION_FAILED",
    });
  }

  // Ensure incidents:read is always included
  const scopesSet = new Set(input.scopes ?? ["incidents:read", "incidents:propose"]);
  scopesSet.add("incidents:read");
  const scopes = Array.from(scopesSet);

  const { key, prefix, hash } = generateMcpKey();
  const id = newId("mck");
  const userId = ctx.userId ?? "system";

  const database = db();
  await database.insert(mcp_api_keys).values({
    id,
    workspace_id: ctx.workspaceId,
    user_id: userId,
    name,
    prefix,
    key_hash: hash,
    scopes,
  });

  return {
    key, // Plaintext shown only once!
    record: {
      id,
      name,
      prefix,
      scopes,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function revokeMcpKey(ctx: ServiceContext, id: string): Promise<void> {
  const database = db();
  await database
    .update(mcp_api_keys)
    .set({ revoked_at: new Date() })
    .where(
      and(
        eq(mcp_api_keys.id, id),
        eq(mcp_api_keys.workspace_id, ctx.workspaceId),
      ),
    );
}

export async function listMcpKeys(ctx: ServiceContext): Promise<McpKeyRecord[]> {
  const database = db();
  const rows = await database
    .select()
    .from(mcp_api_keys)
    .where(
      and(
        eq(mcp_api_keys.workspace_id, ctx.workspaceId),
        isNull(mcp_api_keys.revoked_at),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    scopes: r.scopes,
    lastUsedAt: r.last_used_at ? r.last_used_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  }));
}

/**
 * Validates an MCP Bearer token.
 * Note: Not scoped to a workspace parameter because the key ITSELF determines the identity and workspace!
 */
export async function validateMcpKey(rawKey: string): Promise<Identity | null> {
  if (!rawKey || !rawKey.startsWith("fbk_")) {
    return null;
  }

  const hash = hashKey(rawKey);
  const database = db();

  const rows = await database
    .select()
    .from(mcp_api_keys)
    .where(
      and(
        eq(mcp_api_keys.key_hash, hash),
        isNull(mcp_api_keys.revoked_at),
      ),
    )
    .limit(1);

  if (rows.length === 0 || !rows[0]) {
    return null;
  }

  const row = rows[0];

  // Update last_used_at lazily/asynchronously
  database
    .update(mcp_api_keys)
    .set({ last_used_at: new Date() })
    .where(eq(mcp_api_keys.id, row.id))
    .catch(() => {});

  return {
    keyId: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    scopes: row.scopes,
  };
}
