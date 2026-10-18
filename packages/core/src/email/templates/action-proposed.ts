import { renderBaseEmail, escapeHtml } from "./base.js";

export interface ActionProposedEmailProps {
  incidentId: string;
  actionId: string;
  serviceName: string;
  suspectSha?: string | null;
  suspectMessage?: string | null;
  targetSha?: string | null;
  targetUrl?: string | null;
  expiresAt: string | Date;
  appUrl: string;
}

export function buildActionProposedEmail({
  incidentId,
  actionId,
  serviceName,
  suspectSha,
  suspectMessage,
  targetSha,
  targetUrl,
  expiresAt,
  appUrl,
}: ActionProposedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[Firebreak] ACTION REQUIRED: Approve rollback for ${serviceName}`;
  const incidentUrl = `${appUrl}/app/incidents/${incidentId}`;
  const expiryDate = new Date(expiresAt);
  const formattedExpiry = isNaN(expiryDate.getTime())
    ? "15 minutes"
    : expiryDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

  const suspectDisplay = suspectSha ? suspectSha.slice(0, 7) : "Active deployment";
  const targetDisplay = targetSha ? targetSha.slice(0, 7) : "Last known healthy deployment";

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">
        HUMAN APPROVAL REQUIRED
      </span>
      <span style="font-size: 13px; color: #94a3b8; margin-left: 10px;">
        Lease expires at <strong style="color: #f1f5f9;">${escapeHtml(formattedExpiry)}</strong>
      </span>
    </div>

    <p style="margin-top: 0; margin-bottom: 16px;">
      An automated rollback action has been proposed for <strong>${escapeHtml(serviceName)}</strong>. Preflight safety checks passed. A human operator must review and authorize the production deployment change before it executes.
    </p>

    <!-- Rollback Diff Details Card -->
    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="font-size: 13px;">
        <tr>
          <td style="color: #64748b; padding: 6px 0; width: 140px; font-family: monospace;">Service</td>
          <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600;">${escapeHtml(serviceName)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Suspect Commit</td>
          <td style="color: #f87171; padding: 6px 0; font-family: monospace;">
            <code>${escapeHtml(suspectDisplay)}</code> ${suspectMessage ? `— <span style="color: #94a3b8; font-family: sans-serif;">${escapeHtml(suspectMessage)}</span>` : ""}
          </td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Rollback Target</td>
          <td style="color: #34d399; padding: 6px 0; font-family: monospace;">
            <code>${escapeHtml(targetDisplay)}</code> ${targetUrl ? `<a href="${targetUrl}" style="color: #a855f7; font-size: 11px; margin-left: 6px; text-decoration: underline;" target="_blank">preview</a>` : ""}
          </td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Approval Window</td>
          <td style="color: #fbbf24; padding: 6px 0;">Expires at ${escapeHtml(formattedExpiry)} (15-minute lease)</td>
        </tr>
      </table>
    </div>
  `;

  const securityNote = `
    <strong>Security Invariant:</strong> To prevent unauthorized or accidental modifications, production rollbacks cannot be approved via direct email links or GET parameters. Clicking below takes you to the authenticated Firebreak incident room.
  `;

  const html = renderBaseEmail({
    title: `Approve Rollback: ${serviceName}`,
    preheader: `[APPROVAL REQUIRED] Rollback proposed for ${serviceName}. Review suspect commit and authorize execution.`,
    contentHtml,
    ctaText: "Review & Authorize Rollback",
    ctaUrl: incidentUrl,
    securityNote,
    appUrl,
  });

  const text = `[Firebreak] ACTION REQUIRED: Approve rollback for ${serviceName}

An automated rollback action has been proposed for ${serviceName}.
Suspect commit: ${suspectDisplay}${suspectMessage ? ` (${suspectMessage})` : ""}
Rollback target: ${targetDisplay}
Approval window: Expires at ${formattedExpiry} (15m lease)

SECURITY NOTICE: Production rollbacks cannot be triggered from an email link. You must review and authorize the action within the authenticated Firebreak console.

Review & Authorize: ${incidentUrl}
Manage Notifications: ${appUrl}/app/settings/account
`;

  return { subject, html, text };
}
