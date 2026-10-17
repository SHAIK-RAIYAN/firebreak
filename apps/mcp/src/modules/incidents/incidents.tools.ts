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
  listIncidents,
  getIncidentCard,
  getIncidentDetail,
  resolveIncidentId,
} from "@firebreak/core";
import {
  ListIncidentsInput,
  GetIncidentInput,
  GetSuspectsInput,
  GetAnalysisInput,
  GetTimelineInput,
} from "./schemas.js";

@Injectable({ deps: [] })
export class IncidentTools {
  @Tool({
    name: "list_incidents",
    title: "List incidents",
    description:
      "List Firebreak incidents. Defaults to active ones. Use this first when the user asks what is broken, on fire, or failing.",
    inputSchema: ListIncidentsInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Listing incidents…", invoked: "Incidents loaded" },
  })
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async listIncidents(raw: unknown, ctx: ExecutionContext) {
    const input = ListIncidentsInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, async () => {
      const res = await listIncidents(coreCtx(id), {
        status: input.status,
        serviceId: input.serviceId,
        limit: input.limit,
      });
      return res.items.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        service: i.service.name,
        status: i.status,
        severity: i.severity,
        openedAt: i.openedAt,
        topSuspect: i.topSuspect
          ? { shortSha: i.topSuspect.shortSha, message: i.topSuspect.message }
          : null,
      }));
    });
  }

  @Tool({
    name: "get_incident",
    title: "Get incident",
    description:
      "Get one Firebreak incident with status, deployments, top suspects, the proposed action and recent timeline. Use after list_incidents. Accepts the incident id (inc_…) or its number (e.g. 12 for INC-12).",
    inputSchema: GetIncidentInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Reading incident…", invoked: "Incident loaded" },
  })
  @Widget("incident-card")
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async getIncident(raw: unknown, ctx: ExecutionContext) {
    const input = GetIncidentInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, () => getIncidentCard(coreCtx(id), input));
  }

  @Tool({
    name: "get_suspects",
    title: "Get suspects",
    description:
      "Show the commits most likely to have caused an incident, ranked by a deterministic score with evidence (files and functions that match the error). Use when the user asks what broke or which commit caused it.",
    inputSchema: GetSuspectsInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Ranking suspects…", invoked: "Suspects ranked" },
  })
  @Widget("suspect-list")
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async getSuspects(raw: unknown, ctx: ExecutionContext) {
    const input = GetSuspectsInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, async () => {
      const c = coreCtx(id);
      const incidentId = await resolveIncidentId(c, input.incident);
      const detail = await getIncidentDetail(c, incidentId);

      const limit = input.limit ?? 5;
      return {
        incident: {
          id: detail.incident.id,
          number: detail.incident.number,
          title: detail.incident.title,
        },
        deployments: {
          bad: detail.incident.badDeployment
            ? {
                id: detail.incident.badDeployment.id,
                shortSha: detail.incident.badDeployment.sha
                  ? detail.incident.badDeployment.sha.slice(0, 7)
                  : null,
              }
            : null,
          good: detail.incident.goodDeployment
            ? {
                id: detail.incident.goodDeployment.id,
                shortSha: detail.incident.goodDeployment.sha
                  ? detail.incident.goodDeployment.sha.slice(0, 7)
                  : null,
              }
            : null,
        },
        confidence: detail.incident.traceConfidence,
        suspects: detail.suspects.slice(0, limit).map((s) => ({
          rank: s.rank,
          shortSha: s.shortSha,
          message: s.message,
          author: s.author,
          points: s.points,
          score: s.score,
          url: s.url,
          evidence: s.evidence.map((e) => ({ kind: e.kind, label: e.label })),
          files: s.files.map((f) => ({ path: f.path, matched: f.matched })),
        })),
      };
    });
  }

  @Tool({
    name: "get_analysis",
    title: "Get analysis",
    description:
      "Get the AI-written explanation and fix suggestions for an incident, if available. This is advisory; suspects and actions are computed without AI.",
    inputSchema: GetAnalysisInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Reading analysis…", invoked: "Analysis loaded" },
  })
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async getAnalysis(raw: unknown, ctx: ExecutionContext) {
    const input = GetAnalysisInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, async () => {
      const c = coreCtx(id);
      const incidentId = await resolveIncidentId(c, input.incident);
      const detail = await getIncidentDetail(c, incidentId);

      if (!detail.analysis || detail.analysis.status === "skipped") {
        return {
          status: "skipped",
          reason: detail.analysis?.skipReason ?? "AI analysis was skipped",
        };
      }

      if (detail.analysis.status === "ready" && detail.analysis.result) {
        return {
          status: "ready",
          provider: detail.analysis.provider,
          model: detail.analysis.model,
          summary: detail.analysis.result.summary,
          likelyCause: detail.analysis.result.likelyCause,
          confidence: detail.analysis.result.confidence,
          fixSuggestions: detail.analysis.result.fixSuggestions,
          unknowns: detail.analysis.result.unknowns,
        };
      }

      return {
        status: detail.analysis.status,
        provider: detail.analysis.provider,
        model: detail.analysis.model,
        summary: null,
        likelyCause: null,
        confidence: null,
        fixSuggestions: [],
        unknowns: [],
      };
    });
  }

  @Tool({
    name: "get_timeline",
    title: "Get timeline",
    description:
      "Get the ordered audit trail of an incident: alerts, ranking, proposals, approvals, rollback, health checks.",
    inputSchema: GetTimelineInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
    invocation: { invoking: "Reading timeline…", invoked: "Timeline loaded" },
  })
  @UseGuards(McpKeyGuard)
  @RateLimit({ requests: 60, window: "1m", key: rateKey })
  async getTimeline(raw: unknown, ctx: ExecutionContext) {
    const input = GetTimelineInput.parse(raw);
    const id = identity(ctx);
    requireScope(id, "incidents:read");
    return runTool(ctx, async () => {
      const c = coreCtx(id);
      const incidentId = await resolveIncidentId(c, input.incident);
      const detail = await getIncidentDetail(c, incidentId);

      const limit = input.limit ?? 20;
      // Timeline in getIncidentDetail is chronological (oldest to newest)
      // Newest last per doc 05 §6
      const sliced = detail.timeline.slice(-limit);
      return sliced.map((t) => ({
        at: t.at,
        type: t.type,
        actor: t.actorType,
        summary: t.summary,
      }));
    });
  }
}
