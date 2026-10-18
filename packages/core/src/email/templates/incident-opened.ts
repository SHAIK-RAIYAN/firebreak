import { renderBaseEmail, escapeHtml } from "./base.js";

export interface IncidentOpenedEmailProps {
  incidentId: string;
  serviceName: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  summary: string;
  appUrl: string;
}

export function buildIncidentOpenedEmail({
  incidentId,
  serviceName,
  severity,
  summary,
  appUrl,
}: IncidentOpenedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const normSeverity = severity.toLowerCase();
  const badgeColor =
    normSeverity === "critical"
      ? "#ef4444"
      : normSeverity === "high"
      ? "#f97316"
      : normSeverity === "medium"
      ? "#f59e0b"
      : "#3b82f6";

  const subject = `[Firebreak] [${severity.toUpperCase()}] Incident detected: ${serviceName}`;
  const incidentUrl = `${appUrl}/app/incidents/${incidentId}`;

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${badgeColor}20; color: ${badgeColor}; border: 1px solid ${badgeColor}40;">
        ${escapeHtml(severity.toUpperCase())}
      </span>
      <span style="font-size: 13px; color: #94a3b8; margin-left: 10px;">
        Incident ID: <code style="font-family: monospace; color: #f1f5f9;">${escapeHtml(incidentId)}</code>
      </span>
    </div>

    <p style="margin-top: 0; margin-bottom: 16px;">
      Firebreak detected an anomalous error or health-probe failure on <strong>${escapeHtml(serviceName)}</strong>. Automated tracing has initiated to isolate suspect git commits and calculate candidate rollback targets.
    </p>

    <!-- Incident Detail Card -->
    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="font-size: 13px;">
        <tr>
          <td style="color: #64748b; padding: 6px 0; width: 120px; font-family: monospace;">Service</td>
          <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600;">${escapeHtml(serviceName)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Severity</td>
          <td style="color: ${badgeColor}; padding: 6px 0; font-weight: 600; text-transform: uppercase;">${escapeHtml(severity)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 6px 0; font-family: monospace;">Failure</td>
          <td style="color: #e2e8f0; padding: 6px 0;">${escapeHtml(summary || "Probe failure or unhandled exception alert")}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0; color: #94a3b8; font-size: 13px;">
      Follow real-time telemetry, suspect rankings, and AI analysis directly in the incident console.
    </p>
  `;

  const html = renderBaseEmail({
    title: `Incident detected on ${serviceName}`,
    preheader: `[${severity.toUpperCase()}] Firebreak detected an incident on ${serviceName}. Tracing suspect commits.`,
    contentHtml,
    ctaText: "View Incident",
    ctaUrl: incidentUrl,
    appUrl,
  });

  const text = `[Firebreak] [${severity.toUpperCase()}] Incident detected: ${serviceName}

Firebreak detected an anomalous error or health-probe failure on ${serviceName}.
Incident ID: ${incidentId}
Severity: ${severity.toUpperCase()}
Failure: ${summary || "Probe failure or unhandled exception alert"}

View Incident: ${incidentUrl}
Manage Notifications: ${appUrl}/app/settings/account
`;

  return { subject, html, text };
}
