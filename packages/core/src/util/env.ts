/**
 * Read a required environment variable or throw an error.
 * Never logs or prints values for security.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * Read an optional environment variable with a fallback.
 */
export function optionalEnv(name: string, fallback: string = ""): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return fallback;
  }
  return value;
}
