import type { ExecutionContext } from "@nitrostack/core";

export type Identity = {
  workspaceId: string;
  userId: string;
  keyId: string;
  scopes: string[];
};

const verified = new WeakMap<object, Identity>();

export function setIdentity(ctx: ExecutionContext, id: Identity): void {
  verified.set(ctx, id);
}

export function identity(ctx: ExecutionContext): Identity {
  const id = verified.get(ctx);
  if (!id) {
    throw new Error("UNAUTHENTICATED: missing or invalid Firebreak MCP key");
  }
  return id;
}

export function requireScope(
  id: Identity,
  scope: "incidents:read" | "actions:propose" | "actions:approve",
): void {
  if (!id.scopes.includes(scope)) {
    throw new Error(`FORBIDDEN: this key lacks the '${scope}' permission`);
  }
}
