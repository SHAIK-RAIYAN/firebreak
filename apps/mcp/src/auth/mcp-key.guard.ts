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
    let id: any = null;

    if (raw) {
      id = await this.keys.validate(raw);
      if (!id) {
        ctx.logger.warn("mcp auth: invalid key", { prefix: raw.slice(0, 12) });
        return false;
      }
    } else {
      const stdio = !process.env.MCP_TRANSPORT_TYPE || process.env.MCP_TRANSPORT_TYPE === "stdio";
      if (stdio) {
        id = await this.keys.getDefaultStudioIdentity();
      }
    }

    if (!id) {
      ctx.logger.warn("mcp auth: no key");
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
    const h = ctx.metadata?.["authorization"] || ctx.metadata?.["Authorization"];
    if (typeof h === "string") {
      if (h.startsWith("Bearer fbk_")) return h.slice(7).trim();
      if (h.startsWith("Bearer ")) return h.slice(7).trim();
      if (h.startsWith("fbk_")) return h.trim();
    }
    const anyCtx = ctx as any;
    const directKey = anyCtx.params?.key || anyCtx.params?.apiKey || anyCtx.params?.authKey || anyCtx.args?.key;
    if (typeof directKey === "string" && directKey.startsWith("fbk_")) {
      return directKey.trim();
    }
    const stdio = !process.env.MCP_TRANSPORT_TYPE || process.env.MCP_TRANSPORT_TYPE === "stdio";
    if (stdio || process.env.FIREBREAK_MCP_KEY) {
      return process.env.FIREBREAK_MCP_KEY ?? null;
    }
    return null;
  }
}
