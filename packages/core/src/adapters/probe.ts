export interface ProbeOptions {
  expectedStatus?: number;
  timeoutMs?: number;
}

export type ProbeErrorType = "timeout" | "network" | "dns" | "tls";

export interface ProbeResult {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  observedSha: string | null;
  error: ProbeErrorType | null;
}

/**
 * Probes a health check URL.
 * - Does not follow redirects (redirect: "manual")
 * - Reads up to 64 KB of body
 * - Extracts "sha" if the body is valid JSON
 * - Never throws: catches all network/abort errors and returns a structured ProbeResult
 */
export async function probe(
  url: string,
  opts: ProbeOptions = {},
): Promise<ProbeResult> {
  const expectedStatus = opts.expectedStatus ?? 200;
  const timeoutMs = opts.timeoutMs ?? 8000;

  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      ...({ cache: "no-store" } as any),
      headers: {
        "cache-control": "no-cache",
        "user-agent": "FirebreakProbe/1.0",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Date.now() - startTime;
    const httpStatus = res.status;

    let observedSha: string | null = null;

    try {
      // Read at most 64 KB
      const reader = res.body?.getReader();
      if (reader) {
        let bytesRead = 0;
        const chunks: Uint8Array[] = [];
        const MAX_BYTES = 64 * 1024;

        while (true) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          chunks.push(value);
          bytesRead += value.byteLength;
          if (bytesRead >= MAX_BYTES) {
            await reader.cancel();
            break;
          }
        }

        const totalBuffer = new Uint8Array(bytesRead);
        let offset = 0;
        for (const chunk of chunks) {
          totalBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }

        const text = new TextDecoder().decode(totalBuffer);
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && typeof parsed.sha === "string") {
          observedSha = parsed.sha;
        }
      }
    } catch {
      // Non-JSON or unreadable body is fine; observedSha remains null
    }

    const ok = httpStatus === expectedStatus;

    return {
      ok,
      httpStatus,
      latencyMs,
      observedSha,
      error: null,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = String(err);
    const errorName = (err as Error)?.name || "";

    let errorType: ProbeErrorType = "network";

    if (errorName === "TimeoutError" || errorName === "AbortError" || errorMsg.includes("timeout") || errorMsg.includes("aborted")) {
      errorType = "timeout";
    } else if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("EAI_AGAIN") || errorMsg.includes("dns")) {
      errorType = "dns";
    } else if (errorMsg.includes("CERT") || errorMsg.includes("TLS") || errorMsg.includes("SSL") || errorMsg.includes("unable to verify")) {
      errorType = "tls";
    }

    return {
      ok: false,
      httpStatus: null,
      latencyMs: errorType === "timeout" ? timeoutMs : latencyMs,
      observedSha: null,
      error: errorType,
    };
  }
}
