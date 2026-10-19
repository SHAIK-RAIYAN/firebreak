import { Injectable } from "@nitrostack/core";
import { validateMcpKey, db, workspaces } from "@firebreak/core";
import type { Identity } from "../auth/identity.js";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Ensure environment variables are loaded regardless of current working directory
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), ".env.nitrostack"),
  path.resolve(process.cwd(), "apps/mcp/.env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../../.env.nitrostack"),
];
for (const p of candidateEnvPaths) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: false });
    }
  } catch {
    // Ignore read errors
  }
}

interface CacheEntry {
  identity: Identity;
  expiresAt: number;
}

@Injectable({ deps: [] })
export class KeyService {
  private cache = new Map<string, CacheEntry>();

  async validate(rawKey: string): Promise<Identity | null> {
    if (!rawKey || !rawKey.startsWith("fbk_")) {
      return null;
    }

    const hash = createHash("sha256").update(rawKey).digest("hex");
    const now = Date.now();
    const cached = this.cache.get(hash);

    if (cached && cached.expiresAt > now) {
      return cached.identity;
    }

    try {
      const verified = await validateMcpKey(rawKey);
      if (!verified) {
        this.cache.delete(hash);
        return null;
      }

      const id: Identity = {
        workspaceId: verified.workspaceId,
        userId: (verified as any).userId ?? verified.keyId,
        keyId: verified.keyId,
        scopes: verified.scopes,
      };

      this.cache.set(hash, { identity: id, expiresAt: now + 60 * 1000 });
      return id;
    } catch {
      return null;
    }
  }

  async getDefaultStudioIdentity(): Promise<Identity> {
    try {
      const database = db();
      const rows = await database.select().from(workspaces).limit(1);
      if (rows[0]) {
        return {
          workspaceId: rows[0].id,
          userId: rows[0].owner_user_id,
          keyId: "local_studio_dev",
          scopes: ["incidents:read", "actions:propose", "actions:approve"],
        };
      }
    } catch {
      // Fallback if DB query fails or unconfigured
    }

    return {
      workspaceId: "ws_1alsok80tozt4sqaq650",
      userId: "usr_1alsok80tozt4sqaq650",
      keyId: "local_studio_dev",
      scopes: ["incidents:read", "actions:propose", "actions:approve"],
    };
  }
}

