import { z } from "@nitrostack/core";

export const McpEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MCP_TRANSPORT_TYPE: z.enum(["stdio", "http", "dual"]).default("stdio"),
  PORT: z.coerce.number().default(3005),
  HOST: z.string().default("localhost"),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z.string().refine((val) => {
    try {
      const buf = Buffer.from(val, "base64");
      return buf.length === 32;
    } catch {
      return false;
    }
  }, "ENCRYPTION_KEY must be a base64-encoded 32-byte key"),
  FIREBREAK_APP_URL: z.string().default("http://localhost:3000"),
  FIREBREAK_MCP_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_DEV: z.string().optional(),
  NITRO_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type McpEnv = z.infer<typeof McpEnvSchema>;

let cachedEnv: McpEnv | null = null;

export function getMcpEnv(): McpEnv {
  if (cachedEnv) return cachedEnv;
  const result = McpEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`MCP environment validation failed: ${errorDetails}`);
  }
  cachedEnv = result.data;
  return cachedEnv;
}
