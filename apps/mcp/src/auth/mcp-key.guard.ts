import { Injectable, type ExecutionContext, type Guard } from "@nitrostack/core";
import { KeyService } from "../shared/key.service.js";
import { setIdentity } from "./identity.js";

@Injectable({ deps: [KeyService] })
export class McpKeyGuard implements Guard {
  private readonly keys: KeyService;

  constructor(...args: unknown[]) {
    this.keys = (args[0] as KeyService) ?? new KeyService();
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const raw = this.extract(ctx);
    if (!raw) {
      ctx.logger.warn("mcp auth: no key");
      return false;
    }
    const id = await this.keys.validate(raw); // null if unknown/revoked
    if (!id) {
      ctx.logger.warn("mcp auth: invalid key", { prefix: raw.slice(0, 12) });
      return false;
    }
    setIdentity(ctx, id);
    ctx.auth = {
      authenticated: true,
      subject: id.userId,
      scopes: id.scopes,
      clientId: id.keyId,
    };
    return true;
  }

  private extract(ctx: ExecutionContext): string | null {
    const h = ctx.metadata?.["authorization"];
    if (typeof h === "string" && h.startsWith("Bearer fbk_")) {
      return h.slice(7).trim();
    }
    const stdio = !process.env.MCP_TRANSPORT_TYPE || process.env.MCP_TRANSPORT_TYPE === "stdio";
    if (stdio && process.env.NODE_ENV !== "production") {
      return process.env.FIREBREAK_MCP_KEY ?? null;
    }
    return null;
  }
}
