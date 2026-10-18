import { renderBaseEmail, escapeHtml } from "./base.js";

export interface ActionFailedEmailProps {
  incidentId: string;
  actionId: string;
  serviceName: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  appUrl: string;
}

export function buildActionFailedEmail({
  incidentId,
  actionId,
  serviceName,
  errorCode,
  errorMessage,
  appUrl,
}: ActionFailedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[Firebreak] FAILED: Rollback failed for ${serviceName}`;
  const incidentUrl = `${appUrl}/app/incidents/${incidentId}`;
  const errorDisplay = errorMessage || "Action execution or verification timed out";
  const codeDisplay = errorCode || "EXECUTION_OR_VERIFY_ERROR";

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
        MITIGATION FAILED
      </span>
      <span style="font-size: 13px; color: #94a3b8; margin-left: 10px;">
        Action ID: <code style="font-family: monospace; color: #f1f5f9;">${escapeHtml(actionId)}</code>
      </span>
    </div>

    <p style="margin-top: 0; margin-bottom: 16px;">
      The automated rollback for <strong>${escapeHtml(serviceName)}</strong> could not be completed successfully. Immediate manual triage and operator intervention is required.
    </p>

    <!-- Failure Card -->
    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="font-size: 13px;">
        <tr>
          <td style="color: #64748b; padding: 6px 0; width: 140px; font-family: monospace;">Service</td>
          <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600;">${escapeHtml(serviceName)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Error Code</td>
          <td style="color: #ef4444; padding: 6px 0; font-family: monospace;">${escapeHtml(codeDisplay)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Failure Detail</td>
          <td style="color: #e2e8f0; padding: 6px 0;">${escapeHtml(errorDisplay)}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0; color: #94a3b8; font-size: 13px;">
      Inspect recent deployment logs, provider error payloads, and active incident timeline events in the console.
    </p>
  `;

  const html = renderBaseEmail({
    title: `Rollback Failed: ${serviceName}`,
    preheader: `[MITIGATION FAILED] Rollback for ${serviceName} encountered an error: ${errorDisplay}`,
    contentHtml,
    ctaText: "Investigate Incident",
    ctaUrl: incidentUrl,
    appUrl,
  });

  const text = `[Firebreak] FAILED: Rollback failed for ${serviceName}

The automated rollback for ${serviceName} could not be completed successfully.
Action ID: ${actionId}
Error Code: ${codeDisplay}
Failure Detail: ${errorDisplay}

Investigate Incident: ${incidentUrl}
Manage Notifications: ${appUrl}/app/settings/account
`;

  return { subject, html, text };
}
