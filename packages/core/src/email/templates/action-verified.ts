import { renderBaseEmail, escapeHtml } from "./base.js";

export interface ActionVerifiedEmailProps {
  incidentId: string;
  actionId: string;
  serviceName: string;
  targetSha?: string | null;
  streak: number;
  appUrl: string;
}

export function buildActionVerifiedEmail({
  incidentId,
  actionId,
  serviceName,
  targetSha,
  streak,
  appUrl,
}: ActionVerifiedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[Firebreak] RESOLVED: Rollback verified for ${serviceName}`;
  const incidentUrl = `${appUrl}/app/incidents/${incidentId}`;
  const targetDisplay = targetSha ? targetSha.slice(0, 7) : "Rollback deployment";

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
        VERIFIED RECOVERED
      </span>
      <span style="font-size: 13px; color: #94a3b8; margin-left: 10px;">
        Health probe streak: <strong style="color: #34d399;">${streak}/${streak} consecutive passes</strong>
      </span>
    </div>

    <p style="margin-top: 0; margin-bottom: 16px;">
      The production rollback for <strong>${escapeHtml(serviceName)}</strong> completed successfully. Synthetic health probes verified that production is healthy and responsive.
    </p>

    <!-- Verification Card -->
    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="font-size: 13px;">
        <tr>
          <td style="color: #64748b; padding: 6px 0; width: 140px; font-family: monospace;">Service</td>
          <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600;">${escapeHtml(serviceName)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Recovery Status</td>
          <td style="color: #34d399; padding: 6px 0; font-weight: 600;">Resolved & Verified</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Live Deployment</td>
          <td style="color: #f1f5f9; padding: 6px 0; font-family: monospace;">
            <code>${escapeHtml(targetDisplay)}</code>
          </td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Probe Verification</td>
          <td style="color: #94a3b8; padding: 6px 0;">
            ${streak} consecutive HTTP 200 checks across canary probes
          </td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0; color: #94a3b8; font-size: 13px;">
      The incident has been marked resolved. Full timeline evidence and probe timings are recorded on the audit log.
    </p>
  `;

  const html = renderBaseEmail({
    title: `Rollback Verified: ${serviceName}`,
    preheader: `[RESOLVED] Production rollback verified healthy for ${serviceName}. ${streak} healthy probe checks.`,
    contentHtml,
    ctaText: "View Incident Timeline",
    ctaUrl: incidentUrl,
    appUrl,
  });

  const text = `[Firebreak] RESOLVED: Rollback verified for ${serviceName}

The production rollback for ${serviceName} completed successfully.
Live Deployment: ${targetDisplay}
Verification: ${streak}/${streak} consecutive healthy probes passed.
Status: Incident marked resolved.

View Timeline: ${incidentUrl}
Manage Notifications: ${appUrl}/app/settings/account
`;

  return { subject, html, text };
}
