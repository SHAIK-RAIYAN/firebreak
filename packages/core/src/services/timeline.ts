import { eq, and } from "drizzle-orm";
import { type Database } from "../db/client.js";
import { timeline_events, type TimelineEventType } from "../db/schema.js";
import { newId } from "../util/ids.js";
import { now } from "../util/time.js";

export type RecordTimelineEventParams = {
  workspaceId: string;
  incidentId: string;
  type: TimelineEventType | string;
  summary: string;
  data?: Record<string, unknown>;
  actorType?: "system" | "user" | "mcp" | "ai";
  actorId?: string | null;
  occurredAt?: Date;
};

export async function recordTimelineEvent(
  db: Database,
  params: RecordTimelineEventParams,
) {
  const eventId = newId("evt");

  const [row] = await db
    .insert(timeline_events)
    .values({
      id: eventId,
      workspace_id: params.workspaceId,
      incident_id: params.incidentId,
      type: params.type,
      summary: params.summary,
      data: params.data ?? {},
      actor_type: params.actorType ?? "system",
      actor_id: params.actorId ?? null,
      at: params.occurredAt ?? now(),
    })
    .returning();

  return row;
}

export async function listTimelineEvents(
  db: Database,
  workspaceId: string,
  incidentId: string,
) {
  return db
    .select()
    .from(timeline_events)
    .where(
      and(
        eq(timeline_events.workspace_id, workspaceId),
        eq(timeline_events.incident_id, incidentId),
      ),
    )
    .orderBy(timeline_events.at);
}
