import { eq, and, sql } from "drizzle-orm";
import { db as defaultDb, type Database } from "../db/client.js";
import {
  incidents,
  services,
  alerts,
  suspects,
  vercel_connections,
  github_installations,
  type DeploymentRef,
} from "../db/schema.js";
import { type ServiceContext } from "./context.js";
import { getVercelClientForWorkspace } from "./integrations.js";
import { githubForInstallation } from "../adapters/github.js";
import { rankSuspects, type Frame, type CommitInput } from "../domain/ranking.js";
import { AppError, reasonOf } from "../domain/errors.js";
import { pMap } from "../util/pmap.js";
import { now } from "../util/time.js";
import { newId } from "../util/ids.js";
import { recordTimelineEvent } from "./timeline.js";
import { scrubSecrets } from "../crypto/scrub.js";

export type TraceIncidentResult = {
  hasTarget: boolean;
};

export async function traceIncident(
  ctx: ServiceContext,
  incidentId: string,
  customDb?: Database,
): Promise<TraceIncidentResult> {
  const db = customDb ?? defaultDb();

  // 1. Load incident + service
  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, incident.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!service) {
    throw new AppError("NOT_FOUND", 404, "Service not found for incident");
  }

  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId: incident.id,
    type: "trace_started",
    summary: `Started trace for incident INC-${incident.number}`,
  });

  try {
    // Check Vercel connection
    let vercel;
    try {
      vercel = await getVercelClientForWorkspace(ctx);
    } catch {
      await db
        .update(incidents)
        .set({
          trace_status: "failed",
          trace_error: "vercel_not_connected",
          status: sql`case when ${incidents.status} = 'open' then 'triaged' else ${incidents.status} end`,
        })
        .where(eq(incidents.id, incident.id));

      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: incident.id,
        type: "trace_failed",
        summary: "Trace failed: Vercel account not connected",
        data: { error: "vercel_not_connected" },
      });

      return { hasTarget: false };
    }

    // 2. Resolve deployments
    const bad = await vercel.getCurrentProduction(service.vercel_project_id);

    // Check if the first alert has an observed sha differing from current production
    const [firstAlert] = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.incident_id, incident.id), eq(alerts.workspace_id, ctx.workspaceId)))
      .orderBy(sql`${alerts.occurred_at} asc`)
      .limit(1);

    const alertPayload = firstAlert?.payload as Record<string, unknown> | undefined;
    const observed = alertPayload?.observed as { sha?: string } | undefined;
    const shaMismatch =
      observed?.sha && bad.sha && observed.sha !== bad.sha
        ? { observed: observed.sha, current: bad.sha }
        : undefined;

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "deployments_resolved",
      summary: `Resolved production deployment: ${bad.id} (${bad.sha?.slice(0, 7) ?? "unknown"})`,
      data: {
        badDeployment: bad,
        ...(shaMismatch ? { shaMismatch } : {}),
      },
    });

    // 3. Rollback target selection
    const earlierIncidents = await db
      .select({ badDeployment: incidents.bad_deployment })
      .from(incidents)
      .where(
        and(
          eq(incidents.service_id, service.id),
          sql`${incidents.id} != ${incident.id} and ${incidents.bad_deployment} is not null`,
        ),
      );

    const knownBadIds = earlierIncidents
      .map((r) => (r.badDeployment as DeploymentRef | null)?.id)
      .filter((id): id is string => Boolean(id));

    const good = await vercel.getRollbackTarget(service.vercel_project_id, bad, knownBadIds);

    // 4. Compare commits via GitHub App
    let commitInputs: CommitInput[] = [];

    if (good && good.sha && bad.sha) {
      const [installation] = await db
        .select()
        .from(github_installations)
        .where(
          and(
            eq(github_installations.id, service.github_installation_id),
            eq(github_installations.workspace_id, ctx.workspaceId),
          ),
        )
        .limit(1);

      if (!installation) {
        throw new AppError("UPSTREAM_ERROR", "GitHub installation not found", {
          reason: "GITHUB_NOT_CONNECTED",
        });
      }

      const octokit = await githubForInstallation(installation.installation_id);
      const compareResult = await octokit.compare(
        service.repo_owner,
        service.repo_name,
        good.sha,
        bad.sha,
      );

      // Compare returns commits newest-first, up to 20
      commitInputs = await pMap(
        compareResult.commits,
        async (c) => {
          const files = await octokit.getCommitFiles(
            service.repo_owner,
            service.repo_name,
            c.sha,
          );
          return {
            sha: c.sha,
            message: c.message,
            authorLogin: c.authorLogin,
            authorName: c.authorName,
            committedAt: c.committedAt,
            htmlUrl: c.htmlUrl,
            parents: c.parents,
            files,
          };
        },
        { concurrency: 5 },
      );
    }

    // 5. Collect frames from all alerts of this incident
    const allAlerts = await db
      .select({ payload: alerts.payload, title: alerts.title })
      .from(alerts)
      .where(and(eq(alerts.incident_id, incident.id), eq(alerts.workspace_id, ctx.workspaceId)));

    const rawFrames: Frame[] = [];
    let errorMessage: string | null = null;

    for (const a of allAlerts) {
      const payload = a.payload as Record<string, unknown> | undefined;
      const errorObj = payload?.error as { message?: string; frames?: Frame[] } | undefined;
      if (!errorMessage && errorObj?.message) {
        errorMessage = errorObj.message;
      }
      if (Array.isArray(errorObj?.frames)) {
        rawFrames.push(...errorObj.frames);
      }
    }

    if (!errorMessage && allAlerts[0]?.title) {
      errorMessage = allAlerts[0].title;
    }

    // Deduplicate frames by file+line+function, max 30
    const seenFrameKeys = new Set<string>();
    const deduplicatedFrames: Frame[] = [];

    for (const f of rawFrames) {
      const key = `${f.file}:${f.line ?? ""}:${f.function ?? ""}`;
      if (!seenFrameKeys.has(key)) {
        seenFrameKeys.add(key);
        deduplicatedFrames.push(f);
        if (deduplicatedFrames.length >= 30) break;
      }
    }

    // 6. Rank suspects
    const { suspects: rankedSuspects, confidence: traceConfidence } = rankSuspects({
      frames: deduplicatedFrames,
      errorMessage,
      commits: commitInputs,
    });

    // Upsert suspects (top 10)
    for (const suspect of rankedSuspects.slice(0, 10)) {
      const commit = commitInputs.find((c) => c.sha === suspect.sha);
      const filesWithScrubbedExcerpts = suspect.files.map((f: (typeof suspect.files)[number]) => {
        if (suspect.rank <= 5 && f.patchExcerpt) {
          return { ...f, patchExcerpt: scrubSecrets(f.patchExcerpt) };
        }
        return f;
      });

      const suspectId = newId("sus");
      await db
        .insert(suspects)
        .values({
          id: suspectId,
          workspace_id: ctx.workspaceId,
          incident_id: incident.id,
          sha: suspect.sha,
          short_sha: suspect.sha.slice(0, 7),
          rank: suspect.rank,
          points: suspect.points,
          score: suspect.score,
          message: commit?.message ?? "",
          author_login: commit?.authorLogin ?? null,
          author_name: commit?.authorName ?? "Unknown",
          committed_at: commit?.committedAt ? new Date(commit.committedAt) : now(),
          html_url:
            commit?.htmlUrl ??
            `https://github.com/${service.repo_owner}/${service.repo_name}/commit/${suspect.sha}`,
          evidence: suspect.evidence,
          files: filesWithScrubbedExcerpts,
        })
        .onConflictDoUpdate({
          target: [suspects.incident_id, suspects.sha],
          set: {
            rank: suspect.rank,
            points: suspect.points,
            score: suspect.score,
            message: commit?.message ?? "",
            evidence: suspect.evidence,
            files: filesWithScrubbedExcerpts,
          },
        });
    }

    // 7. Update incident
    await db
      .update(incidents)
      .set({
        bad_deployment: bad,
        good_deployment: good ?? null,
        trace_status: "ready",
        trace_confidence: traceConfidence,
        status: sql`case when ${incidents.status} = 'open' then 'triaged' else ${incidents.status} end`,
        updated_at: now(),
      })
      .where(eq(incidents.id, incident.id));

    const top = rankedSuspects[0];
    const topCommit = commitInputs.find((c) => c.sha === top?.sha);
    const summary =
      rankedSuspects.length > 0 && top
        ? `Ranked ${rankedSuspects.length} commits; top: ${top.sha.slice(0, 7)} ${topCommit?.message?.split("\n")[0] ?? ""}`
        : "No commits in compare range";

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "suspects_ranked",
      summary,
      data: {
        suspectCount: rankedSuspects.length,
        topSha: top?.sha ?? null,
        confidence: traceConfidence,
      },
    });

    return { hasTarget: Boolean(good) };
  } catch (err: unknown) {
    const reason = reasonOf(err);

    if (reason === "VERCEL_UNAUTHORIZED") {
      await db
        .update(vercel_connections)
        .set({ status: "invalid", updated_at: now() })
        .where(eq(vercel_connections.workspace_id, ctx.workspaceId));

      await db
        .update(incidents)
        .set({
          trace_status: "failed",
          trace_error: "vercel_unauthorized",
          status: sql`case when ${incidents.status} = 'open' then 'triaged' else ${incidents.status} end`,
          updated_at: now(),
        })
        .where(eq(incidents.id, incident.id));

      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: incident.id,
        type: "trace_failed",
        summary: "Trace failed: Vercel authorization rejected",
        data: { reason },
      });

      return { hasTarget: false };
    }

    if (reason === "GITHUB_FORBIDDEN" || reason === "NOT_FOUND" || reason === "GITHUB_NOT_CONNECTED") {
      await db
        .update(incidents)
        .set({
          trace_status: "failed",
          trace_error: "github_access",
          status: sql`case when ${incidents.status} = 'open' then 'triaged' else ${incidents.status} end`,
          updated_at: now(),
        })
        .where(eq(incidents.id, incident.id));

      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: incident.id,
        type: "trace_failed",
        summary: "Trace failed: GitHub access failed",
        data: { reason },
      });

      return { hasTarget: false };
    }

    // Retriable / unexpected error
    await db
      .update(incidents)
      .set({
        trace_status: "failed",
        trace_error: err instanceof Error ? err.message : String(err),
        updated_at: now(),
      })
      .where(eq(incidents.id, incident.id));

    throw err;
  }
}
