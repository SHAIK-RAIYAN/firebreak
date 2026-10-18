export interface BaseEmailProps {
  title: string;
  preheader: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  securityNote?: string;
  footerNote?: string;
  appUrl: string;
  notificationSettingsUrl?: string;
}

export function renderBaseEmail({
  title,
  preheader,
  contentHtml,
  ctaText,
  ctaUrl,
  securityNote,
  footerNote,
  appUrl,
  notificationSettingsUrl,
}: BaseEmailProps): string {
  const settingsUrl = notificationSettingsUrl || `${appUrl}/app/settings/account`;
  const consoleUrl = `${appUrl}/app`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: separate;
    }
    a {
      color: #a855f7;
      text-decoration: none;
    }
    .button:hover {
      background-color: #6d28d9 !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; text-align: left;">
          
          <!-- Header Bar with Firebreak Flame Logo -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #1f2937;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <a href="${consoleUrl}" style="text-decoration: none; display: inline-flex; align-items: center;">
                      <!-- Firebreak SVG Brand Mark -->
                      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 10px;">
                        <rect x="2" y="16" width="3" height="12" rx="0.5" fill="#7C3AED" />
                        <rect x="6" y="10" width="3" height="18" rx="0.5" fill="#A855F7" />
                        <rect x="10" y="4" width="3" height="24" rx="0.5" fill="#C026D3" />
                        <rect x="14" y="8" width="3" height="20" rx="0.5" fill="#E879F9" />
                        <rect x="18" y="14" width="3" height="14" rx="0.5" fill="#F0ABFC" />
                        <rect x="26" y="22" width="2.5" height="6" rx="0.5" fill="#4C1D95" opacity="0.6" />
                        <rect x="29.5" y="24" width="2.5" height="4" rx="0.5" fill="#3B0F6B" opacity="0.4" />
                      </svg>
                      <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">firebreak</span>
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Automated Ops</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #f8fafc; letter-spacing: -0.01em; line-height: 1.3;">
                ${escapeHtml(title)}
              </h1>

              <div style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                ${contentHtml}
              </div>

              ${ctaText && ctaUrl ? `
              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-top: 28px; margin-bottom: 8px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #7c3aed;">
                    <a href="${ctaUrl}" class="button" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; background-color: #7c3aed; letter-spacing: -0.01em;">
                      ${escapeHtml(ctaText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${securityNote ? `
              <!-- Security Note Box -->
              <div style="margin-top: 24px; padding: 12px 16px; background-color: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 8px; font-size: 12px; line-height: 1.5; color: #c4b5fd;">
                ${securityNote}
              </div>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0c111d; border-top: 1px solid #1f2937; font-size: 12px; line-height: 1.5; color: #64748b;">
              <div style="margin-bottom: 12px;">
                ${footerNote || "Firebreak monitors deployments, isolates suspect commits, and executes verified rollbacks with proof."}
              </div>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td>
                    <a href="${consoleUrl}" style="color: #94a3b8; text-decoration: underline; margin-right: 14px;">Console</a>
                    <a href="${settingsUrl}" style="color: #94a3b8; text-decoration: underline; margin-right: 14px;">Notification Preferences</a>
                  </td>
                  <td align="right" style="color: #475569;">
                    &copy; Firebreak
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
