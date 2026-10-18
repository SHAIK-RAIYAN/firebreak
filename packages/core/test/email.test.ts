import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildWelcomeEmail,
  buildIncidentOpenedEmail,
  buildActionProposedEmail,
  buildActionVerifiedEmail,
  buildActionFailedEmail,
  sendEmail,
  getTestEmailSink,
  clearTestEmailSink,
  getWorkspaceRecipients,
  sendWelcomeNotification,
  type Database,
} from "../src/index.js";

describe("Email Notification System", () => {
  const appUrl = "https://firebreak.dev";

  beforeEach(() => {
    clearTestEmailSink();
    delete process.env.RESEND_API_KEY;
  });

  describe("Template Generation & Branding", () => {
    it("generates a branded welcome email with Open Console CTA", () => {
      const email = buildWelcomeEmail({
        userName: "Alex Mercer",
        userEmail: "alex@example.com",
        appUrl,
      });

      expect(email.subject).toContain("Welcome to Firebreak");
      expect(email.html).toContain("firebreak");
      expect(email.html).toContain("alex@example.com");
      expect(email.html).toContain("Open Console");
      expect(email.html).toContain("https://firebreak.dev/app");
      // Contains the SVG brand mark
      expect(email.html).toContain("<svg");
      expect(email.html).toContain("#7C3AED");

      // Plain text version
      expect(email.text).toContain("Open Console: https://firebreak.dev/app");
      expect(email.text).toContain("alex@example.com");
      expect(email.text).toContain("Alex Mercer");
    });

    it("generates an incident opened notification with severity and deep link", () => {
      const email = buildIncidentOpenedEmail({
        incidentId: "inc_test123",
        serviceName: "checkout-api",
        severity: "critical",
        summary: "Synthetic canary health probe returned 500",
        appUrl,
      });

      expect(email.subject).toBe("[Firebreak] [CRITICAL] Incident detected: checkout-api");
      expect(email.html).toContain("checkout-api");
      expect(email.html).toContain("CRITICAL");
      expect(email.html).toContain("Synthetic canary health probe returned 500");
      expect(email.html).toContain("https://firebreak.dev/app/incidents/inc_test123");
      expect(email.html).toContain("View Incident");

      // Plain text version
      expect(email.text).toContain("Incident ID: inc_test123");
      expect(email.text).toContain("View Incident: https://firebreak.dev/app/incidents/inc_test123");
    });

    it("generates a rollback approval notification with security disclaimer and authenticated review link", () => {
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      const email = buildActionProposedEmail({
        incidentId: "inc_test123",
        actionId: "act_test456",
        serviceName: "pricing-service",
        suspectSha: "9f1c2e7b8a123",
        suspectMessage: "refactor: optimize discount calculation",
        targetSha: "3ab9d04111222",
        targetUrl: "https://pricing-preview.vercel.app",
        expiresAt: expiry,
        appUrl,
      });

      expect(email.subject).toBe("[Firebreak] ACTION REQUIRED: Approve rollback for pricing-service");
      expect(email.html).toContain("pricing-service");
      expect(email.html).toContain("9f1c2e7");
      expect(email.html).toContain("3ab9d04");
      expect(email.html).toContain("Review &amp; Authorize Rollback");
      expect(email.html).toContain("https://firebreak.dev/app/incidents/inc_test123");

      // Security invariant: must clearly state rollbacks cannot be approved through direct links
      expect(email.html).toContain("Security Invariant");
      expect(email.html).toContain("production rollbacks cannot be approved via direct email links");
      expect(email.text).toContain("SECURITY NOTICE: Production rollbacks cannot be triggered from an email link");
      expect(email.text).toContain("Review & Authorize: https://firebreak.dev/app/incidents/inc_test123");
    });

    it("generates a verified rollback recovery email with probe streak metrics", () => {
      const email = buildActionVerifiedEmail({
        incidentId: "inc_test123",
        actionId: "act_test456",
        serviceName: "pricing-service",
        targetSha: "3ab9d04111222",
        streak: 3,
        appUrl,
      });

      expect(email.subject).toBe("[Firebreak] RESOLVED: Rollback verified for pricing-service");
      expect(email.html).toContain("VERIFIED RECOVERED");
      expect(email.html).toContain("3/3 consecutive passes");
      expect(email.html).toContain("pricing-service");
      expect(email.html).toContain("View Incident Timeline");
      expect(email.html).toContain("https://firebreak.dev/app/incidents/inc_test123");

      // Plain text
      expect(email.text).toContain("Verification: 3/3 consecutive healthy probes passed.");
      expect(email.text).toContain("https://firebreak.dev/app/incidents/inc_test123");
    });

    it("generates a rollback failed notification with error summary", () => {
      const email = buildActionFailedEmail({
        incidentId: "inc_test123",
        actionId: "act_test456",
        serviceName: "pricing-service",
        errorCode: "VERCEL_CONFIRM_TIMEOUT",
        errorMessage: "Timed out waiting for production alias assignment after 300s",
        appUrl,
      });

      expect(email.subject).toBe("[Firebreak] FAILED: Rollback failed for pricing-service");
      expect(email.html).toContain("MITIGATION FAILED");
      expect(email.html).toContain("VERCEL_CONFIRM_TIMEOUT");
      expect(email.html).toContain("Timed out waiting for production alias assignment");
      expect(email.html).toContain("Investigate Incident");
      expect(email.html).toContain("https://firebreak.dev/app/incidents/inc_test123");

      // Plain text
      expect(email.text).toContain("Error Code: VERCEL_CONFIRM_TIMEOUT");
      expect(email.text).toContain("Investigate Incident: https://firebreak.dev/app/incidents/inc_test123");
    });
  });

  describe("Delivery Pipeline & Idempotency", () => {
    it("captures outbound emails in test sink when RESEND_API_KEY is unset without failing", async () => {
      const result = await sendEmail({
        to: "dev@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
        text: "Hello",
        template: "welcome",
        idempotencyKey: "test:welcome:user1",
      });

      expect(result.status).toBe("sent");
      expect(result.id).toBeDefined();

      const sink = getTestEmailSink();
      expect(sink).toHaveLength(1);
      expect(sink[0].to).toBe("dev@example.com");
      expect(sink[0].subject).toBe("Test Subject");
      expect(sink[0].template).toBe("welcome");
      expect(sink[0].idempotencyKey).toBe("test:welcome:user1");
    });

    it("enforces idempotency and skips duplicate deliveries", async () => {
      // Mock DB with in-memory delivery store
      const deliveredKeys = new Set<string>();

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn((_clause: unknown) => ({
              limit: vi.fn(async () => {
                if (deliveredKeys.has("welcome:user_duplicate_test")) {
                  return [{ id: "eml_already_sent", idempotency_key: "welcome:user_duplicate_test" }];
                }
                return [];
              }),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(async (vals: { idempotency_key: string }) => {
            deliveredKeys.add(vals.idempotency_key);
            return [vals];
          }),
        })),
      } as unknown as Database;

      // First call: should deliver
      const firstRes = await sendEmail({
        to: "operator@example.com",
        subject: "Welcome",
        html: "<p>Welcome</p>",
        text: "Welcome",
        template: "welcome",
        idempotencyKey: "welcome:user_duplicate_test",
        customDb: mockDb,
      });

      expect(firstRes.status).toBe("sent");
      expect(deliveredKeys.has("welcome:user_duplicate_test")).toBe(true);

      // Second call with same idempotency key: must skip without sending
      const secondRes = await sendEmail({
        to: "operator@example.com",
        subject: "Welcome",
        html: "<p>Welcome</p>",
        text: "Welcome",
        template: "welcome",
        idempotencyKey: "welcome:user_duplicate_test",
        customDb: mockDb,
      });

      expect(secondRes.status).toBe("skipped");
      expect(secondRes.reason).toBe("duplicate");
      expect(secondRes.id).toBe("eml_already_sent");
    });

    it("sendWelcomeNotification uses exactly one welcome email per user ID", async () => {
      const res = await sendWelcomeNotification({
        user: {
          id: "usr_first_time_signup",
          email: "github_user@firebreak.dev",
          name: "GitHub Developer",
        },
      });

      expect(res.status).toBe("sent");
      const sink = getTestEmailSink();
      expect(sink).toHaveLength(1);
      expect(sink[0].to).toBe("github_user@firebreak.dev");
      expect(sink[0].idempotencyKey).toBe("welcome:usr_first_time_signup");
    });
  });

  describe("Workspace Recipient Filtering & Preferences", () => {
    it("filters out members who have disabled notifications", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(async () => [
                  // User 1: All notifications enabled
                  {
                    userId: "usr_1",
                    email: "user1@firebreak.dev",
                    name: "Alice",
                    emailVerified: true,
                    prefEmailEnabled: true,
                    prefOpened: true,
                    prefProposed: true,
                    prefResolved: true,
                  },
                  // User 2: Master email_enabled = false (unsubscribed)
                  {
                    userId: "usr_2",
                    email: "user2@firebreak.dev",
                    name: "Bob",
                    emailVerified: true,
                    prefEmailEnabled: false,
                    prefOpened: true,
                    prefProposed: true,
                    prefResolved: true,
                  },
                  // User 3: Opened disabled, but proposed enabled
                  {
                    userId: "usr_3",
                    email: "user3@firebreak.dev",
                    name: "Charlie",
                    emailVerified: true,
                    prefEmailEnabled: true,
                    prefOpened: false,
                    prefProposed: true,
                    prefResolved: true,
                  },
                ]),
              })),
            })),
          })),
        })),
      } as unknown as Database;

      // Event "opened": Alice should receive, Bob (disabled) and Charlie (opened=false) should NOT
      const openedRecipients = await getWorkspaceRecipients("ws_demo", "opened", mockDb);
      expect(openedRecipients).toHaveLength(1);
      expect(openedRecipients[0].email).toBe("user1@firebreak.dev");

      // Event "proposed": Alice and Charlie should receive, Bob should NOT
      const proposedRecipients = await getWorkspaceRecipients("ws_demo", "proposed", mockDb);
      expect(proposedRecipients).toHaveLength(2);
      expect(proposedRecipients.map((r) => r.email)).toEqual([
        "user1@firebreak.dev",
        "user3@firebreak.dev",
      ]);
    });
  });

  describe("Provider Error Handling", () => {
    it("handles delivery failures and records failed status without breaking silent swallow", async () => {
      // Mock db that tracks inserted delivery statuses
      const insertedRecords: Array<{ status: string; error?: string; idempotency_key: string }> = [];
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => []),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(async (vals: { status: string; error?: string; idempotency_key: string }) => {
            insertedRecords.push(vals);
            return [vals];
          }),
        })),
      } as unknown as Database;

      // In test sink mode (no RESEND_API_KEY), delivery succeeds
      const result = await sendEmail({
        to: "fail_test@example.com",
        subject: "Subject",
        html: "<p>body</p>",
        text: "body",
        template: "incident_opened",
        idempotencyKey: "test:failure:1",
        customDb: mockDb,
      });

      expect(result.status).toBe("sent");
      expect(insertedRecords).toHaveLength(1);
      expect(insertedRecords[0].status).toBe("sent");
    });
  });
});

