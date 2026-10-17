import pino from "pino";

/**
 * Pino logger configured for Firebreak.
 * ALWAYS writes to stderr (fd 2) so stdout remains reserved for MCP stdio protocol.
 * Comprehensive redaction of sensitive credentials.
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    redact: [
      "*.apiKey",
      "*.token",
      "*.authorization",
      "*.secret",
      "*.ciphertext",
      "headers.authorization",
      "headers.cookie",
      'headers["x-firebreak-signature"]',
      "headers.x-firebreak-signature",
    ],
  },
  pino.destination(2),
);
