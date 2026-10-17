export type ActorType = "system" | "user" | "mcp" | "ai";

export interface Identity {
  keyId: string;
  workspaceId: string;
  name: string;
  scopes: string[];
}

export interface ServiceContext {
  workspaceId: string;
  actorType: ActorType;
  userId?: string;
  identity?: Identity;
}

export function systemCtx(workspaceId: string): ServiceContext {
  return {
    workspaceId,
    actorType: "system",
  };
}

export function userCtx(workspaceId: string, userId: string): ServiceContext {
  return {
    workspaceId,
    actorType: "user",
    userId,
  };
}

export function mcpCtx(identity: Identity): ServiceContext {
  return {
    workspaceId: identity.workspaceId,
    actorType: "mcp",
    identity,
  };
}
