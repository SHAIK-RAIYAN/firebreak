import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db as defaultDb, type Database } from "../db/client.js";
import { email_deliveries } from "../db/schema.js";
import { newId } from "../util/ids.js";
import { logger } from "../util/logger.js";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: "welcome" | "incident_opened" | "action_proposed" | "action_verified" | "action_failed";
  idempotencyKey?: string;
  workspaceId?: string | null;
  userId?: string | null;
  from?: string;
  customDb?: Database;
}

export interface SendEmailResult {
  status: "sent" | "skipped" | "failed";
  id?: string;
  reason?: string;
  error?: string;
}

export interface SentEmailRecord {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  idempotencyKey?: string;
  workspaceId?: string | null;
  userId?: string | null;
  sentAt: Date;
}

let testEmailSink: SentEmailRecord[] = [];

/**
 * Access the captured emails in test or development mode.
 */
export function getTestEmailSink(): SentEmailRecord[] {
  return [...testEmailSink];
}

/**
 * Clear the captured emails sink (useful before test cases).
 */
export function clearTestEmailSink(): void {
  testEmailSink = [];
}

let _resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resendClient) {
    _resendClient = new Resend(apiKey);
  }
  return _resendClient;
}

/**
 * Sends an email using Resend, with idempotency guarantees, deduplication,
 * and graceful fallback for tests/development when RESEND_API_KEY is not set.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const {
    to,
    subject,
    html,
    text,
    template,
    idempotencyKey,
    workspaceId = null,
    userId = null,
    customDb,
  } = options;

  let db: Database | null = null;
  if (customDb) {
    db = customDb;
  } else {
    try {
      db = defaultDb();
    } catch {
      db = null;
    }
  }

  const from =
    options.from ||
    process.env.RESEND_FROM_EMAIL ||
    "Firebreak <onboarding@resend.dev>";

  // 1. Idempotency check: prevent duplicate deliveries from Inngest retries or duplicate events
  if (idempotencyKey && db) {
    try {
      const [existing] = await db
        .select()
        .from(email_deliveries)
        .where(eq(email_deliveries.idempotency_key, idempotencyKey))
        .limit(1);

      if (existing) {
        logger.info(
          { idempotencyKey, template, to, existingId: existing.id },
          "Email skipped: delivery with this idempotency key already exists",
        );
        return {
          status: "skipped",
          id: existing.id,
          reason: "duplicate",
        };
      }
    } catch (dbErr) {
      // In test runs without full DB or migration, log warning and proceed
      logger.warn({ dbErr, idempotencyKey }, "Could not check email idempotency in database");
    }
  }

  const resend = getResendClient();

  // 2. If no Resend API key is configured (local dev, CI tests without credentials)
  if (!resend) {
    const deliveryId = newId("eml");
    logger.info(
      { to, subject, template, idempotencyKey },
      "RESEND_API_KEY not configured — recording email to test/dev sink",
    );

    testEmailSink.push({
      to,
      from,
      subject,
      html,
      text,
      template,
      idempotencyKey,
      workspaceId,
      userId,
      sentAt: new Date(),
    });

    if (idempotencyKey && db) {
      try {
        await db.insert(email_deliveries).values({
          id: deliveryId,
          workspace_id: workspaceId,
          user_id: userId,
          idempotency_key: idempotencyKey,
          recipient_email: to,
          template,
          subject,
          resend_id: `test_${deliveryId}`,
          status: "sent",
        });
      } catch (insertErr) {
        logger.warn({ insertErr }, "Could not persist test email delivery record");
      }
    }

    return {
      status: "sent",
      id: deliveryId,
    };
  }

  // 3. Send via Resend API
  const deliveryId = newId("eml");
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      headers: idempotencyKey ? { "X-Entity-Ref-ID": idempotencyKey } : undefined,
    });

    if (error) {
      logger.error({ error, to, subject, template }, "Resend API returned delivery error");

      if (idempotencyKey && db) {
        try {
          await db.insert(email_deliveries).values({
            id: deliveryId,
            workspace_id: workspaceId,
            user_id: userId,
            idempotency_key: idempotencyKey,
            recipient_email: to,
            template,
            subject,
            status: "failed",
            error: error.message,
          });
        } catch {
          // Ignore secondary DB insert failure
        }
      }

      throw new Error(`Resend email delivery failed: ${error.message}`);
    }

    // 4. Record successful delivery
    if (idempotencyKey && db) {
      try {
        await db.insert(email_deliveries).values({
          id: deliveryId,
          workspace_id: workspaceId,
          user_id: userId,
          idempotency_key: idempotencyKey,
          recipient_email: to,
          template,
          subject,
          resend_id: data?.id,
          status: "sent",
        });
      } catch (dbErr) {
        logger.warn({ dbErr, deliveryId }, "Failed to record email delivery in database");
      }
    }

    logger.info(
      { deliveryId, resendId: data?.id, to, template, subject },
      "Email delivered successfully via Resend",
    );

    return {
      status: "sent",
      id: data?.id || deliveryId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to, subject, template }, "Exception while sending email via Resend");

    if (idempotencyKey && db) {
      try {
        await db.insert(email_deliveries).values({
          id: deliveryId,
          workspace_id: workspaceId,
          user_id: userId,
          idempotency_key: idempotencyKey,
          recipient_email: to,
          template,
          subject,
          status: "failed",
          error: message,
        });
      } catch {
        // Ignore DB insert failure
      }
    }

    throw err;
  }
}
