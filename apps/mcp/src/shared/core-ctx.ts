import type { Identity } from "../auth/identity.js";
import { mcpCtx, type ServiceContext } from "@firebreak/core";

export function coreCtx(id: Identity): ServiceContext {
  return mcpCtx({
    keyId: id.keyId,
    workspaceId: id.workspaceId,
    name: id.keyId,
    scopes: id.scopes,
  });
}
