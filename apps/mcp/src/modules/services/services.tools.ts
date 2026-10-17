import {
  ToolDecorator as Tool,
  UseGuards,
  RateLimit,
  Injectable,
  type ExecutionContext,
} from "@nitrostack/core";
import { McpKeyGuard } from "../../auth/mcp-key.guard.js";
import { identity, requireScope } from "../../auth/identity.js";
import { rateKey } from "../../shared/rate-key.js";
import { runTool } from "../../shared/tool-error.js";
import { coreCtx } from "../../shared/core-ctx.js";
import { listServices } from "@firebreak/core";
import { ListServicesInput } from "./schemas.js";

@Injectable({ deps: [] })
export class ServiceTools {
  @Tool({
    name: "list_services",
    title: "List services",
    description:
      "List the services Firebreak protects (GitHub repo + Vercel project + health URL) and whether each has an active incident.",
    inputSchema: ListServicesInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Listing services…", invoked: "Services loaded" },
  })
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async listServices(raw: unknown, ctx: ExecutionContext) {
    ListServicesInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, async () => {
      const services = await listServices(coreCtx(id));
      return services.map((s) => ({
        id: s.id,
        name: s.name,
        repo: s.repo,
        vercelProject: s.vercelProjectName,
        healthUrl: s.healthUrl,
        activeIncident: s.activeIncident
          ? {
              id: s.activeIncident.id,
              number: s.activeIncident.number,
              status: s.activeIncident.status,
            }
          : null,
      }));
    });
  }
}
