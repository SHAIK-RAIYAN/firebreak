import { createHash } from "node:crypto";
import type { ExecutionContext } from "@nitrostack/core";

export const rateKey = (ctx: ExecutionContext): string =>
  "mcp:" +
  createHash("sha256")
    .update(String(ctx.metadata?.["authorization"] ?? "stdio"))
    .digest("hex")
    .slice(0, 16);
