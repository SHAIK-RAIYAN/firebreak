import { renderBaseEmail, escapeHtml } from "./base.js";

export interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  appUrl: string;
}

export function buildWelcomeEmail({ userName, userEmail, appUrl }: WelcomeEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Welcome to Firebreak — Roll back bad deploys with proof";
  const displayName = userName || "Operator";
  const consoleUrl = `${appUrl}/app`;

  const contentHtml = `
    <p style="margin-top: 0; margin-bottom: 16px;">
      Hello <strong>${escapeHtml(displayName)}</strong>,
    </p>
    <p style="margin-bottom: 16px; color: #94a3b8;">
      Welcome to Firebreak. When production breaks, Firebreak traces alerts to suspect git commits in under 5 seconds, stages safe rollbacks, and verifies system recovery with synthetic health probes.
    </p>

    <!-- Account & Notification Summary Card -->
    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #7c3aed; letter-spacing: 0.05em; margin-bottom: 10px;">
        Notification Configuration
      </div>
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="font-size: 13px; font-family: monospace;">
        <tr>
          <td style="color: #64748b; padding: 4px 0; width: 140px;">Recipient</td>
          <td style="color: #f1f5f9; padding: 4px 0;">${escapeHtml(userEmail)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Provider</td>
          <td style="color: #f1f5f9; padding: 4px 0;">GitHub OAuth (Verified)</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Active Alerts</td>
          <td style="color: #34d399; padding: 4px 0;">Incident opened, Approval required, Verified recovery</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0; color: #94a3b8; font-size: 13px;">
      Your personal workspace is ready. Connect a GitHub repository and deploy platform to activate automated rollback safeguards.
    </p>
  `;

  const html = renderBaseEmail({
    title: "Your Firebreak Safeguard is Active",
    preheader: "Welcome to Firebreak. Your automated rollback safeguards and notification pipeline are configured.",
    contentHtml,
    ctaText: "Open Console",
    ctaUrl: consoleUrl,
    appUrl,
  });

  const text = `Welcome to Firebreak — Roll back bad deploys with proof

Hello ${displayName},

Welcome to Firebreak. When production breaks, Firebreak traces alerts to suspect git commits in under 5 seconds, stages safe rollbacks, and verifies system recovery with synthetic health probes.

Notification Configuration:
- Recipient: ${userEmail}
- Provider: GitHub OAuth (Verified)
- Active Alerts: Incident opened, Approval required, Verified recovery

Your personal workspace is ready. Connect a GitHub repository and deploy platform to activate automated rollback safeguards.

Open Console: ${consoleUrl}
Manage Notifications: ${appUrl}/app/settings/account
`;

  return { subject, html, text };
}
