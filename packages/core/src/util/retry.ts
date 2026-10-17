export type RetryOptions = {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  retryOn?: (err: unknown) => boolean;
};

/**
 * Execute an async function with exponential backoff and full jitter.
 * Respects Retry-After header (in seconds or ms) if present on the error object.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseMs = options.baseMs ?? 300;
  const maxMs = options.maxMs ?? 3000;
  const retryOn = options.retryOn ?? (() => true);

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (attempt >= retries || !retryOn(err)) {
        throw err;
      }

      attempt++;

      // Check for Retry-After on error (seconds or ms)
      let delayMs = 0;
      const maybeError = err as { retryAfter?: number; headers?: Headers | Record<string, string> };
      if (typeof maybeError?.retryAfter === "number") {
        delayMs = maybeError.retryAfter * 1000;
      } else if (maybeError?.headers) {
        const rawHeader =
          typeof maybeError.headers.get === "function"
            ? maybeError.headers.get("retry-after")
            : (maybeError.headers as Record<string, string>)["retry-after"];
        if (rawHeader) {
          const parsed = Number.parseFloat(rawHeader);
          if (!Number.isNaN(parsed) && parsed > 0) {
            delayMs = parsed * 1000;
          }
        }
      }

      // If no Retry-After, compute full jitter exponential backoff:
      // random between 0 and min(maxMs, baseMs * 2^(attempt - 1))
      if (delayMs <= 0) {
        const exponentialMax = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
        delayMs = Math.floor(Math.random() * exponentialMax);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
