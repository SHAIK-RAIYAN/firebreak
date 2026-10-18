import { eq, and, sql, desc } from "drizzle-orm";
import { generateText, Output } from "ai";
import { db as defaultDb, type Database } from "../db/client.js";
import {
  workspaces,
  ai_credentials,
  analyses,
  incidents,
  services,
  suspects,
  alerts,
  actions,
  type SuspectFile,
  type Evidence,
} from "../db/schema.js";
import { type ServiceContext } from "./context.js";
import { sealWith, openWith } from "../crypto/secrets.js";
import { AppError } from "../domain/errors.js";
import { newId } from "../util/ids.js";
import { now } from "../util/time.js";
import { logger } from "../util/logger.js";
import { recordTimelineEvent } from "./timeline.js";
import {
  PROVIDERS,
  modelFor,
  type ProviderId,
} from "../ai/models.js";
import { INCIDENT_ANALYST_SYSTEM_PROMPT } from "../ai/prompts/incident-analyst.js";
import { AnalysisSchema, type Analysis } from "../ai/schema.js";
import { sanitizeAnalysis } from "../ai/sanitize.js";
import { buildIncidentBundle } from "../ai/bundle.js";

export const AI_DEFAULT_DAILY_LIMIT = 20;

export interface AiSettingsView {
  mode: "default" | "byok";
  activeProvider: string | null;
  quota: {
    used: number;
    limit: number;
    remaining: number;
  };
  credentials: Array<{
    provider: string;
    model: string;
    last4: string;
    status: string;
    validatedAt: string | null;
  }>;
}

export async function getAiSettings(
  ctx: ServiceContext,
  customDb?: Database,
): Promise<AiSettingsView> {
  const db = customDb ?? defaultDb();

  // Compute daily quota boundary
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Execute independent queries in parallel via Promise.all
  const [[workspace], creds, [quotaResult]] = await Promise.all([
    db
      .select({
        mode: workspaces.ai_mode,
        provider: workspaces.ai_provider,
      })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1),

    db
      .select({
        provider: ai_credentials.provider,
        model: ai_credentials.model,
        last4: ai_credentials.last4,
        status: ai_credentials.status,
        validatedAt: ai_credentials.validated_at,
      })
      .from(ai_credentials)
      .where(eq(ai_credentials.workspace_id, ctx.workspaceId)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(analyses)
      .where(
        and(
          eq(analyses.workspace_id, ctx.workspaceId),
          eq(analyses.key_source, "default"),
          sql`${analyses.created_at} >= ${startOfDay}`,
        ),
      ),
  ]);

  if (!workspace) {
    throw new AppError("NOT_FOUND", 404, "Workspace not found");
  }

  const used = quotaResult?.count ?? 0;
  const remaining = Math.max(0, AI_DEFAULT_DAILY_LIMIT - used);

  return {
    mode: (workspace.mode as "default" | "byok") ?? "default",
    activeProvider: workspace.provider ?? null,
    quota: {
      used,
      limit: AI_DEFAULT_DAILY_LIMIT,
      remaining,
    },
    credentials: creds.map((c) => ({
      provider: c.provider,
      model: c.model ?? "",
      last4: c.last4,
      status: c.status,
      validatedAt: c.validatedAt?.toISOString() ?? null,
    })),
  };
}

export async function updateAiSettings(
  ctx: ServiceContext,
  input: {
    mode: "default" | "byok";
    provider?: string | null;
  },
  customDb?: Database,
): Promise<AiSettingsView> {
  const db = customDb ?? defaultDb();

  await db
    .update(workspaces)
    .set({
      ai_mode: input.mode,
      ai_provider: input.provider ?? null,
    })
    .where(eq(workspaces.id, ctx.workspaceId));

  return getAiSettings(ctx, db);
}

export async function saveAiKey(
  ctx: ServiceContext,
  provider: ProviderId,
  input: {
    apiKey: string;
    model?: string;
  },
  customDb?: Database,
): Promise<{ provider: string; model: string; last4: string; status: string }> {
  const db = customDb ?? defaultDb();

  if (!(provider in PROVIDERS)) {
    throw new AppError("VALIDATION_FAILED", 422, `Invalid AI provider: ${provider}`);
  }

  const providerConfig = PROVIDERS[provider];
  const cheapModel =
    providerConfig.models.find((m) => "cheap" in m && m.cheap)?.id ??
    providerConfig.models.find((m) => "default" in m && m.default)?.id ??
    providerConfig.models[0]!.id;

  const defaultModel =
    providerConfig.models.find((m) => "default" in m && m.default)?.id ??
    providerConfig.models[0]!.id;

  const chosenModel = input.model ?? defaultModel;

  // Validate on save: one tiny call with the cheap model (doc 07 §3.3)
  let status: "active" | "invalid" = "active";
  try {
    await generateText({
      model: modelFor(provider, input.apiKey, cheapModel),
      prompt: "Reply with OK",
      maxOutputTokens: 16,
      abortSignal: AbortSignal.timeout(10_000),
    });
  } catch (err: unknown) {
    const error = err as { status?: number; statusCode?: number; message?: string };
    const httpStatus = error.status ?? error.statusCode;
    if (httpStatus === 401 || httpStatus === 403) {
      throw new AppError("VALIDATION_FAILED", 422, "Key rejected by provider (401/403)", {
        provider,
      });
    }
    // Network or temporary error: save with active status per doc 07 §3.3
    logger.warn({ err, provider }, "AI key validation call had non-auth failure; saving key");
  }

  const aad = `${ctx.workspaceId}:ai:${provider}`;
  const sealed = sealWith(aad, input.apiKey);
  const last4 = input.apiKey.slice(-4);
  const currentTime = now();
  const credentialId = newId("aic");

  await db
    .insert(ai_credentials)
    .values({
      id: credentialId,
      workspace_id: ctx.workspaceId,
      provider,
      model: chosenModel,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      auth_tag: sealed.authTag,
      key_version: sealed.keyVersion,
      last4,
      status,
      validated_at: currentTime,
      created_at: currentTime,
      updated_at: currentTime,
    })
    .onConflictDoUpdate({
      target: [ai_credentials.workspace_id, ai_credentials.provider],
      set: {
        model: chosenModel,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        auth_tag: sealed.authTag,
        key_version: sealed.keyVersion,
        last4,
        status,
        validated_at: currentTime,
        updated_at: currentTime,
      },
    });

  // Also set workspace to BYOK mode for this provider
  await db
    .update(workspaces)
    .set({
      ai_mode: "byok",
      ai_provider: provider,
    })
    .where(eq(workspaces.id, ctx.workspaceId));

  return {
    provider,
    model: chosenModel,
    last4,
    status,
  };
}

export async function deleteAiKey(
  ctx: ServiceContext,
  provider: ProviderId,
  customDb?: Database,
): Promise<{ ok: boolean }> {
  const db = customDb ?? defaultDb();

  await db
    .delete(ai_credentials)
    .where(
      and(
        eq(ai_credentials.workspace_id, ctx.workspaceId),
        eq(ai_credentials.provider, provider),
      ),
    );

  // If deleted provider was the active one, fallback to default mode
  const [ws] = await db
    .select({ provider: workspaces.ai_provider })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1);

  if (ws?.provider === provider) {
    await db
      .update(workspaces)
      .set({
        ai_mode: "default",
        ai_provider: null,
      })
      .where(eq(workspaces.id, ctx.workspaceId));
  }

  return { ok: true };
}

export async function analyzeIncident(
  ctx: ServiceContext,
  incidentId: string,
  attempt = 1,
  customDb?: Database,
): Promise<{ status: "ready" | "failed" | "skipped"; skipReason?: string }> {
  const db = customDb ?? defaultDb();

  // Load incident, service, suspects, alerts, proposed action
  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    return { status: "failed" };
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, incident.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!service) {
    return { status: "failed" };
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1);

  // Resolve key and provider (doc 07 §2.2)
  let provider: ProviderId | null = null;
  let modelId: string | null = null;
  let apiKey: string | null = null;
  let keySource: "byok" | "default" = "default";

  if (workspace?.ai_mode === "byok" && workspace?.ai_provider) {
    const [cred] = await db
      .select()
      .from(ai_credentials)
      .where(
        and(
          eq(ai_credentials.workspace_id, ctx.workspaceId),
          eq(ai_credentials.provider, workspace.ai_provider),
          eq(ai_credentials.status, "active"),
        ),
      )
      .limit(1);

    if (cred) {
      provider = cred.provider as ProviderId;
      modelId =
        cred.model ??
        PROVIDERS[provider].models.find((m) => "default" in m && m.default)?.id ??
        PROVIDERS[provider].models[0]!.id;
      const aad = `${ctx.workspaceId}:ai:${provider}`;
      apiKey = openWith(aad, {
        ciphertext: cred.ciphertext,
        iv: cred.iv,
        authTag: cred.auth_tag,
        keyVersion: cred.key_version,
      });
      keySource = "byok";
    }
  }

  if (!apiKey || !provider || !modelId) {
    // Check daily quota for platform default
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [quotaResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analyses)
      .where(
        and(
          eq(analyses.workspace_id, ctx.workspaceId),
          eq(analyses.key_source, "default"),
          sql`${analyses.created_at} >= ${startOfDay}`,
        ),
      );

    const used = quotaResult?.count ?? 0;
    if (used >= AI_DEFAULT_DAILY_LIMIT) {
      await recordSkippedAnalysis(db, ctx, incidentId, attempt, "quota_exceeded");
      return { status: "skipped", skipReason: "quota_exceeded" };
    }

    const defaultProvider = (process.env.DEFAULT_AI_PROVIDER as ProviderId) ?? "google";
    const defaultKey = process.env.DEFAULT_AI_API_KEY;
    const defaultModel =
      process.env.DEFAULT_AI_MODEL ??
      PROVIDERS[defaultProvider]?.models.find((m) => "default" in m && m.default)?.id ??
      "gemini-3.8-flash";

    if (!defaultKey || !(defaultProvider in PROVIDERS)) {
      await recordSkippedAnalysis(db, ctx, incidentId, attempt, "no_key");
      return { status: "skipped", skipReason: "no_key" };
    }

    provider = defaultProvider;
    apiKey = defaultKey;
    modelId = defaultModel;
    keySource = "default";
  }

  // Load suspects
  const suspectRows = await db
    .select()
    .from(suspects)
    .where(and(eq(suspects.incident_id, incident.id), eq(suspects.workspace_id, ctx.workspaceId)))
    .orderBy(desc(suspects.points));

  // Load first alert
  const [alertRow] = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.incident_id, incident.id), eq(alerts.workspace_id, ctx.workspaceId)))
    .limit(1);

  // Load proposed action
  const [actionRow] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.incident_id, incident.id), eq(actions.workspace_id, ctx.workspaceId)))
    .orderBy(desc(actions.created_at))
    .limit(1);

  const bundleXml = buildIncidentBundle({
    incident: {
      id: incident.id,
      opened_at: incident.opened_at,
      bad_deployment: incident.bad_deployment,
      good_deployment: incident.good_deployment,
    },
    service: {
      name: service.name,
    },
    alert: alertRow
      ? {
          severity: alertRow.severity,
          source: alertRow.source,
          payload: alertRow.payload as any,
        }
      : null,
    suspects: suspectRows.map((s) => ({
      id: s.id,
      rank: s.rank,
      points: s.points,
      score: s.score,
      sha: s.sha,
      author_name: s.author_name,
      message: s.message,
      evidence: (s.evidence as Evidence[]) ?? [],
      files: (s.files as SuspectFile[]) ?? [],
    })),
    proposedAction: actionRow
      ? {
          type: actionRow.type,
          target_sha: (actionRow.target_deployment as any)?.sha,
        }
      : null,
  });

  const validSuspectIds = suspectRows.map((s) => s.id);
  const validEvidenceIds = suspectRows.flatMap((s) =>
    ((s.evidence as Evidence[]) ?? []).map((e) => e.id),
  );
  const rankOneSuspectId = suspectRows.find((s) => s.rank === 1)?.id ?? null;

  const analysisId = newId("ana");
  const startTime = Date.now();

  try {
    const result = await generateText({
      model: modelFor(provider, apiKey, modelId),
      system: INCIDENT_ANALYST_SYSTEM_PROMPT,
      prompt: bundleXml,
      output: Output.object<Analysis>({ schema: AnalysisSchema as any }),
      maxOutputTokens: 1500,
      abortSignal: AbortSignal.timeout(25_000),
    });

    if (!result.output) {
      throw new Error("Invalid model output");
    }

    const latencyMs = Date.now() - startTime;
    const sanitized = sanitizeAnalysis(result.output as Analysis, {
      validSuspectIds,
      validEvidenceIds,
      rankOneSuspectId,
      serviceRepo: { owner: service.repo_owner, name: service.repo_name },
    });

    const currentTime = now();
    await db
      .insert(analyses)
      .values({
        id: analysisId,
        workspace_id: ctx.workspaceId,
        incident_id: incident.id,
        attempt,
        status: "ready",
        provider,
        model: modelId,
        key_source: keySource,
        result: sanitized,
        latency_ms: latencyMs,
        input_tokens: result.usage?.inputTokens ?? null,
        output_tokens: result.usage?.outputTokens ?? null,
        created_at: currentTime,
        completed_at: currentTime,
      })
      .onConflictDoUpdate({
        target: [analyses.incident_id, analyses.attempt],
        set: {
          status: "ready",
          provider,
          model: modelId,
          key_source: keySource,
          result: sanitized,
          latency_ms: latencyMs,
          input_tokens: result.usage?.inputTokens ?? null,
          output_tokens: result.usage?.outputTokens ?? null,
          completed_at: currentTime,
        },
      });

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "analysis_ready",
      actorType: "ai",
      summary: `AI analysis ready: ${sanitized.summary.slice(0, 100)}`,
      data: {
        analysisId,
        provider,
        model: modelId,
        confidence: sanitized.confidence,
      },
    });

    return { status: "ready" };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, incidentId, attempt }, "AI analysis failed");

    const currentTime = now();
    await db
      .insert(analyses)
      .values({
        id: analysisId,
        workspace_id: ctx.workspaceId,
        incident_id: incident.id,
        attempt,
        status: "failed",
        provider,
        model: modelId,
        key_source: keySource,
        error_code: errorMessage.includes("timeout") ? "timeout" : "unknown",
        created_at: currentTime,
        completed_at: currentTime,
      })
      .onConflictDoUpdate({
        target: [analyses.incident_id, analyses.attempt],
        set: {
          status: "failed",
          error_code: errorMessage.includes("timeout") ? "timeout" : "unknown",
          completed_at: currentTime,
        },
      });

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "analysis_failed",
      actorType: "ai",
      summary: "AI analysis failed",
      data: { error: errorMessage },
    });

    return { status: "failed" };
  }
}

async function recordSkippedAnalysis(
  db: Database,
  ctx: ServiceContext,
  incidentId: string,
  attempt: number,
  skipReason: "no_key" | "quota_exceeded",
) {
  const analysisId = newId("ana");
  const currentTime = now();

  await db
    .insert(analyses)
    .values({
      id: analysisId,
      workspace_id: ctx.workspaceId,
      incident_id: incidentId,
      attempt,
      status: "skipped",
      skip_reason: skipReason,
      created_at: currentTime,
      completed_at: currentTime,
    })
    .onConflictDoUpdate({
      target: [analyses.incident_id, analyses.attempt],
      set: {
        status: "skipped",
        skip_reason: skipReason,
        completed_at: currentTime,
      },
    });

  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId,
    type: "analysis_skipped",
    actorType: "ai",
    summary: `AI analysis skipped: ${skipReason === "no_key" ? "No API key configured" : "Daily quota exceeded"}`,
    data: { skipReason },
  });
}
