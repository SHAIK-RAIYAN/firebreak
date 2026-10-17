import { Injectable } from "@nitrostack/core";
import { validateMcpKey } from "@firebreak/core";
import type { Identity } from "../auth/identity.js";
import { createHash } from "node:crypto";

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
  }
}
