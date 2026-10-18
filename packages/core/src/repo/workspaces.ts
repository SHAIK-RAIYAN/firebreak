import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { workspaces, workspace_members } from "../db/schema.js";
import { newId } from "../util/ids.js";

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

interface CachedWorkspace {
  workspace: Workspace;
  expiresAt: number;
}

const workspaceCache = new Map<string, CachedWorkspace>();
const WORKSPACE_CACHE_TTL_MS = 60_000; // 60 seconds

export const workspacesRepo = {
  /**
   * Find workspace by its ID.
   */
  async getById(workspaceId: string): Promise<Workspace | null> {
    const database = db();
    const rows = await database
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return rows[0] ?? null;
  },

  /**
   * Find personal workspace by owner user ID with fast in-memory TTL cache.
   */
  async getByOwnerUserId(userId: string): Promise<Workspace | null> {
    const cached = workspaceCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.workspace;
    }

    const database = db();
    const rows = await database
      .select()
      .from(workspaces)
      .where(eq(workspaces.owner_user_id, userId))
      .limit(1);

    const ws = rows[0] ?? null;
    if (ws) {
      workspaceCache.set(userId, {
        workspace: ws,
        expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
      });
    }
    return ws;
  },

  /**
   * Clear cache for a user (e.g. after workspace update)
   */
  clearCache(userId: string) {
    workspaceCache.delete(userId);
  },

  /**
   * Idempotent bootstrap: Ensure a user has a personal workspace.
   * If it already exists, returns it. Otherwise creates workspace + owner member.
   */
  async bootstrapPersonalWorkspace(
    userId: string,
    userName?: string | null,
  ): Promise<Workspace> {
    const existing = await this.getByOwnerUserId(userId);
    if (existing) {
      return existing;
    }

    const database = db();
    const id = newId("ws");
    const name = userName ? `${userName}'s workspace` : "My Workspace";

    // Insert workspace with on conflict do nothing (owner_user_id is unique)
    await database
      .insert(workspaces)
      .values({
        id,
        name,
        owner_user_id: userId,
        incident_seq: 0,
        ai_mode: "default",
      })
      .onConflictDoNothing({ target: workspaces.owner_user_id });

    // Fetch the created or existing workspace
    const ws = await this.getByOwnerUserId(userId);
    if (!ws) {
      throw new Error(`Failed to bootstrap workspace for user ${userId}`);
    }

    // Insert owner row into workspace_members
    await database
      .insert(workspace_members)
      .values({
        workspace_id: ws.id,
        user_id: userId,
        role: "owner",
      })
      .onConflictDoNothing();

    return ws;
  },

  /**
   * Atomically increment and return the next incident number for this workspace.
   */
  async nextIncidentNumber(workspaceId: string): Promise<number> {
    const database = db();
    const rows = await database
      .update(workspaces)
      .set({
        incident_seq: sql`${workspaces.incident_seq} + 1`,
      })
      .where(eq(workspaces.id, workspaceId))
      .returning({ seq: workspaces.incident_seq });

    const next = rows[0]?.seq;
    if (next === undefined) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    return next;
  },
};
