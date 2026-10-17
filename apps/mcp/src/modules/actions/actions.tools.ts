import {
  ToolDecorator as Tool,
  Widget,
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
import {
  proposeRollback,
  getAction,
  approveAction,
  resolveIncidentId,
  db,
  actions,
  AppError,
} from "@firebreak/core";
import { eq, and, desc } from "drizzle-orm";
import {
  ProposeRollbackInput,
  GetActionStatusInput,
  ApproveActionInput,
} from "./schemas.js";

@Injectable({ deps: [] })
export class ActionTools {
  @Tool({
    name: "propose_rollback",
    title: "Propose rollback",
    description:
      "Propose rolling production back to the last good deployment for an incident. Runs safety checks. Does NOT change production: a human must approve in Firebreak (approveUrl). Safe to call twice; returns the existing proposal.",
    inputSchema: ProposeRollbackInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    invocation: { invoking: "Proposing rollback…", invoked: "Rollback proposed" },
  })
  @Widget("action-status")
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async proposeRollback(raw: unknown, ctx: ExecutionContext) {
    const input = ProposeRollbackInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "actions:propose");
    return runTool(ctx, async () => {
      const c = coreCtx(id);
      const incidentId = await resolveIncidentId(c, input.incident);
      const result = await proposeRollback(c, incidentId);
      return getAction(c, result.action.id);
    });
  }

  @Tool({
    name: "get_action_status",
    title: "Get action status",
    description:
      "Get the status of a rollback: awaiting approval, executing, verifying with live health checks, verified, or failed. Call repeatedly to follow progress.",
    inputSchema: GetActionStatusInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Checking status…", invoked: "Status loaded" },
  })
  @Widget("action-status")
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async getActionStatus(raw: unknown, ctx: ExecutionContext) {
    const input = GetActionStatusInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, async () => {
      const c = coreCtx(id);
      if (input.action) {
        return getAction(c, input.action);
      }

      const incidentId = await resolveIncidentId(c, input.incident!);
      const database = db();
      const [latestAction] = await database
        .select()
        .from(actions)
        .where(
          and(
            eq(actions.incident_id, incidentId),
            eq(actions.workspace_id, id.workspaceId),
          ),
        )
        .orderBy(desc(actions.created_at))
        .limit(1);

      if (!latestAction) {
        throw new AppError(
          "NOT_FOUND",
          404,
          "No rollback action found for this incident",
        );
      }

      return getAction(c, latestAction.id);
    });
  }

  @Tool({
    name: "approve_action",
    title: "Approve action",
    description:
      "Approve a proposed rollback so Firebreak executes it on Vercel and verifies recovery. This changes production. Only call when the user has explicitly said to approve this specific action. Requires a key with the 'Approve rollbacks' permission.",
    inputSchema: ApproveActionInput,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
    },
    invocation: { invoking: "Approving rollback…", invoked: "Rollback approved" },
  })
  @Widget("action-status")
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async approveAction(raw: unknown, ctx: ExecutionContext) {
    const input = ApproveActionInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "actions:approve");
    return runTool(ctx, async () => {
      const c = coreCtx(id);
      await approveAction(c, input.action, {
        note: input.note,
        via: "mcp",
      });
      return getAction(c, input.action);
    });
  }
}
