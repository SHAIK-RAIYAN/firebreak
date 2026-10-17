import type { ExecutionContext } from "@nitrostack/core";
import { AppError } from "@firebreak/core";

export async function runTool<T>(
  ctx: ExecutionContext,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof AppError) {
      ctx.logger.warn("tool domain error", {
        code: err.code,
        message: err.message,
        details: (err.details as any) ?? null,
      });
      throw new Error(`${err.code}: ${err.message}`);
    }

    if (err instanceof Error) {
      if (
        err.message.startsWith("UNAUTHENTICATED:") ||
        err.message.startsWith("FORBIDDEN:")
      ) {
        throw err;
      }
    }

    ctx.logger.error("tool unhandled error", {
      requestId: ctx.requestId,
      error: err instanceof Error ? err.stack : String(err),
    });
    throw new Error(`INTERNAL: Something went wrong (request ${ctx.requestId})`);
  }
}
