/**
 * Secret scrubber for diffs, logs, and prompt bundles.
 * Removes common API keys, tokens, private keys, and .env secrets.
 */
export function scrubSecrets(text: string): string {
  if (!text) return text;

  let scrubbed = text;

  // Private keys
  scrubbed = scrubbed.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    "[redacted-private-key]",
  );

  // OpenAI / generic sk- keys
  scrubbed = scrubbed.replace(/\bsk-[a-zA-Z0-9_\-]{20,}\b/g, "[redacted-key]");

  // GitHub tokens
  scrubbed = scrubbed.replace(/\bghp_[a-zA-Z0-9]{30,}\b/g, "[redacted-token]");
  scrubbed = scrubbed.replace(/\bgithub_pat_[a-zA-Z0-9_]{20,}\b/g, "[redacted-token]");

  // Slack tokens
  scrubbed = scrubbed.replace(/\bxox[abp]-[a-zA-Z0-9\-]{10,}\b/g, "[redacted-token]");

  // AWS Access Key ID
  scrubbed = scrubbed.replace(/\bAKIA[0-9A-Z]{16}\b/g, "[redacted-aws-key]");

  // Firebreak & Vercel secrets
  scrubbed = scrubbed.replace(/\bwhsec_[a-zA-Z0-9_\-]{20,}\b/g, "[redacted-secret]");
  scrubbed = scrubbed.replace(/\bvcp_[a-zA-Z0-9_\-]{20,}\b/g, "[redacted-token]");
  scrubbed = scrubbed.replace(/\bfbk_[a-zA-Z0-9_\-]{20,}\b/g, "[redacted-key]");

  // .env style lines: KEY=value where key contains SECRET, TOKEN, KEY, PASSWORD
  scrubbed = scrubbed.replace(
    /^([ \t]*[A-Za-z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Za-z0-9_]*\s*=\s*)(["']?)(.*?)\2(\s*)$/gim,
    "$1$2[redacted]$2$4",
  );

  return scrubbed;
}
