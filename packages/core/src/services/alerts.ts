import { z } from "zod";
import { sql, eq, and, notInArray } from "drizzle-orm";
import { db as defaultDb, type Database } from "../db/client.js";
import {
  services,
  alerts,
  incidents,
  usage_counters,
  type AlertSeverity,
} from "../db/schema.js";
import { openWith } from "../crypto/secrets.js";
import { verifyAlertSignature } from "../crypto/hmac.js";
import { AppError } from "../domain/errors.js";
import { newId } from "../util/ids.js";
import { now } from "../util/time.js";
import { logger } from "../util/logger.js";
import { recordTimelineEvent } from "./timeline.js";
import { inngest } from "../inngest/client.js";

export const AlertFrameSchema = z.object({
  file: z.string().max(500),
  line: z.number().int().nullable().optional(),
  function: z.string().max(200).nullable().optional(),
  source: z.enum(["stack", "hint"]).default("stack"),
});

export const AlertErrorSchema = z.object({
  type: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
  frames: z.array(AlertFrameSchema).max(30).default([]),
});

export const AlertObservedSchema = z.object({
  url: z.string().url().optional(),
  status: z.number().int().optional(),
  sha: z.string().max(64).optional(),
});

export const AlertPayloadSchema = z.object({
  id: z.string().max(200).optional(),
  fingerprint: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  severity: z.enum(["critical", "high", "medium", "low"]).default("high"),
  source: z.string().max(50).default("webhook"),
  occurredAt: z.string().datetime().optional(),
  error: AlertErrorSchema.default({ frames: [] }),
  observed: AlertObservedSchema.optional(),
});

export type AlertPayload = z.infer<typeof AlertPayloadSchema>;

export type IngestAlertResult = {
  status: 200 | 202;
  data: {
    alertId: string;
    incidentId: string;
    deduped: boolean;
  };
};

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function maxSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return (SEVERITY_RANK[a] ?? 0) >= (SEVERITY_RANK[b] ?? 0) ? a : b;
}

export async function ingestAlert(params: {
  serviceId: string;
  rawBody: string;
  headers: Record<string, string | string[] | undefined> | Headers;
  db?: Database;
}): Promise<IngestAlertResult> {
  const rawBody = params.rawBody;

  // 1. Check body size <= 64 KB (65,536 bytes)
  const byteLength = Buffer.byteLength(rawBody, "utf8");
  if (byteLength > 64 * 1024) {
    throw new AppError("PAYLOAD_TOO_LARGE", 413, "Alert payload exceeds 64 KB limit");
  }

  // 2. Extract timestamp and signature headers
  let timestampHeader: string | undefined;
  let signatureHeader: string | undefined;

  if (params.headers instanceof Headers) {
    timestampHeader = params.headers.get("x-firebreak-timestamp") ?? undefined;
    signatureHeader = params.headers.get("x-firebreak-signature") ?? undefined;
  } else {
    const rawTs = params.headers["x-firebreak-timestamp"];
    timestampHeader = Array.isArray(rawTs) ? rawTs[0] : rawTs;
    const rawSig = params.headers["x-firebreak-signature"];
    signatureHeader = Array.isArray(rawSig) ? rawSig[0] : rawSig;
  }

  if (!timestampHeader || !signatureHeader) {
    throw new AppError("INVALID_SIGNATURE", 401, "Missing signature or timestamp header");
  }

  const timestamp = Number(timestampHeader);
  if (Number.isNaN(timestamp) || !Number.isFinite(timestamp)) {
    throw new AppError("INVALID_SIGNATURE", 401, "Invalid timestamp header");
  }

  // 3. Check timestamp freshness: |now - ts| <= 300 s
  const currentSec = Math.floor(now().getTime() / 1000);
  if (Math.abs(currentSec - timestamp) > 300) {
    throw new AppError("INVALID_SIGNATURE", 401, "Timestamp out of allowed drift window (±300s)");
  }

  // 4. Load service (not archived)
  const db = params.db ?? defaultDb();
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, params.serviceId), sql`${services.archived_at} is null`))
    .limit(1);

  if (!service) {
    // Perform dummy HMAC to mitigate timing leak
    verifyAlertSignature({
      secret: "whsec_dummy00000000000000000000000000000000",
      header: signatureHeader,
      timestamp,
      rawBody,
    });
    throw new AppError("NOT_FOUND", 404, "Service not found");
  }

  // 5. Decrypt secret & verify signature
  const aad = `${service.workspace_id}:alert:${service.id}`;
  let secret: string;
  try {
    secret = openWith(aad, {
      ciphertext: service.alert_secret_ciphertext,
      iv: service.alert_secret_iv,
      authTag: service.alert_secret_auth_tag,
      keyVersion: service.alert_secret_key_version,
    });
  } catch {
    throw new AppError("INTERNAL", 500, "Failed to decrypt service alert secret");
  }

  const isValid = verifyAlertSignature({
    secret,
    header: signatureHeader,
    timestamp,
    rawBody,
  });

  if (!isValid) {
    throw new AppError("INVALID_SIGNATURE", 401, "Invalid HMAC signature");
  }

  // 6. Parse and validate JSON
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawBody);
  } catch {
    throw new AppError("VALIDATION_FAILED", 422, "Malformed JSON body");
  }

  const parsed = AlertPayloadSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", 422, "Invalid alert payload", {
      issues: parsed.error.issues,
    });
  }
  const payload = parsed.data;

  // 7. Rate limit: 60 alerts/minute per service
  const windowStr = now().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  const rateLimitKey = `alert:${service.id}`;
  const [usage] = await db
    .insert(usage_counters)
    .values({
      key: rateLimitKey,
      window: windowStr,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [usage_counters.key, usage_counters.window],
      set: {
        count: sql`${usage_counters.count} + 1`,
      },
    })
    .returning({ count: usage_counters.count });

  if (usage && usage.count > 60) {
    throw new AppError("RATE_LIMITED", 429, "Rate limit exceeded (max 60 alerts/min per service)");
  }

  // 8. Idempotency check on sender's id
  if (payload.id) {
    const [existingAlert] = await db
      .select({
        id: alerts.id,
        incident_id: alerts.incident_id,
      })
      .from(alerts)
      .where(and(eq(alerts.service_id, service.id), eq(alerts.external_id, payload.id)))
      .limit(1);

    if (existingAlert && existingAlert.incident_id) {
      return {
        status: 200,
        data: {
          alertId: existingAlert.id,
          incidentId: existingAlert.incident_id,
          deduped: true,
        },
      };
    }
  }

  // 9. Check for existing active incident by (serviceId, fingerprint)
  const [activeIncident] = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.service_id, service.id),
        eq(incidents.fingerprint, payload.fingerprint),
        notInArray(incidents.status, ["resolved", "dismissed"]),
      ),
    )
    .orderBy(sql`${incidents.opened_at} desc`)
    .limit(1);

  const alertId = newId("alr");
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : now();

  if (activeIncident) {
    // Attach to existing active incident
    const nextSeverity = maxSeverity(activeIncident.severity as AlertSeverity, payload.severity);

    await db.insert(alerts).values({
      id: alertId,
      workspace_id: service.workspace_id,
      service_id: service.id,
      incident_id: activeIncident.id,
      external_id: payload.id ?? null,
      fingerprint: payload.fingerprint,
      title: payload.title,
      severity: payload.severity,
      source: payload.source,
      occurred_at: occurredAt,
      payload: payload as unknown as Record<string, unknown>,
    });

    await db
      .update(incidents)
      .set({
        alert_count: sql`${incidents.alert_count} + 1`,
        last_alert_at: now(),
        severity: nextSeverity,
      })
      .where(eq(incidents.id, activeIncident.id));

    await recordTimelineEvent(db, {
      workspaceId: service.workspace_id,
      incidentId: activeIncident.id,
      type: "alert_deduped",
      summary: `Additional alert received: ${payload.title}`,
      data: { alertId, fingerprint: payload.fingerprint, severity: payload.severity },
    });

    return {
      status: 202,
      data: {
        alertId,
        incidentId: activeIncident.id,
        deduped: true,
      },
    };
  }

  // 10. Create new Incident
  const [maxNumRow] = await db
    .select({
      maxNum: sql<number>`coalesce(max(${incidents.number}), 0)`,
    })
    .from(incidents)
    .where(eq(incidents.workspace_id, service.workspace_id));

  const incidentNumber = (maxNumRow?.maxNum ?? 0) + 1;
  const incidentId = newId("inc");

  let createdIncidentId = incidentId;
  let isDedupedOnRace = false;

  try {
    await db.insert(incidents).values({
      id: incidentId,
      workspace_id: service.workspace_id,
      service_id: service.id,
      number: incidentNumber,
      title: payload.title,
      fingerprint: payload.fingerprint,
      severity: payload.severity,
      status: "open",
      trace_status: "pending",
      opened_at: now(),
      last_alert_at: now(),
      alert_count: 1,
    });

    await db.insert(alerts).values({
      id: alertId,
      workspace_id: service.workspace_id,
      service_id: service.id,
      incident_id: incidentId,
      external_id: payload.id ?? null,
      fingerprint: payload.fingerprint,
      title: payload.title,
      severity: payload.severity,
      source: payload.source,
      occurred_at: occurredAt,
      payload: payload as unknown as Record<string, unknown>,
    });

    await recordTimelineEvent(db, {
      workspaceId: service.workspace_id,
      incidentId,
      type: "alert_received",
      summary: `Alert received: ${payload.title}`,
      data: { alertId, severity: payload.severity },
    });

    await recordTimelineEvent(db, {
      workspaceId: service.workspace_id,
      incidentId,
      type: "incident_opened",
      summary: `Incident opened: ${payload.title}`,
      data: { number: incidentNumber, fingerprint: payload.fingerprint },
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (
      error?.code === "23505" ||
      error?.message?.includes("unique") ||
      error?.message?.includes("incidents_svc_fingerprint_idx")
    ) {
      const [raceIncident] = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.service_id, service.id),
            eq(incidents.fingerprint, payload.fingerprint),
            notInArray(incidents.status, ["resolved", "dismissed"]),
          ),
        )
        .limit(1);

      if (raceIncident) {
        createdIncidentId = raceIncident.id;
        isDedupedOnRace = true;

        await db.insert(alerts).values({
          id: alertId,
          workspace_id: service.workspace_id,
          service_id: service.id,
          incident_id: raceIncident.id,
          external_id: payload.id ?? null,
          fingerprint: payload.fingerprint,
          title: payload.title,
          severity: payload.severity,
          source: payload.source,
          occurred_at: occurredAt,
          payload: payload as unknown as Record<string, unknown>,
        });

        await db
          .update(incidents)
          .set({
            alert_count: sql`${incidents.alert_count} + 1`,
            last_alert_at: now(),
            severity: maxSeverity(raceIncident.severity as AlertSeverity, payload.severity),
          })
          .where(eq(incidents.id, raceIncident.id));

        await recordTimelineEvent(db, {
          workspaceId: service.workspace_id,
          incidentId: raceIncident.id,
          type: "alert_deduped",
          summary: `Additional alert received: ${payload.title}`,
          data: { alertId, fingerprint: payload.fingerprint },
        });
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  // 11. Dispatch Inngest event if a new incident was created
  if (!isDedupedOnRace) {
    try {
      await inngest.send({
        name: "incident/opened",
        data: {
          incidentId: createdIncidentId,
          workspaceId: service.workspace_id,
        },
      });
    } catch (err) {
      logger.error(
        { err, incidentId: createdIncidentId },
        "Failed to dispatch Inngest event incident/opened",
      );
    }
  }

  return {
    status: 202,
    data: {
      alertId,
      incidentId: createdIncidentId,
      deduped: isDedupedOnRace,
    },
  };
}
