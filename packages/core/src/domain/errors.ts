export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL"
  | "INVALID_SIGNATURE"
  | "PAYLOAD_TOO_LARGE";

export type ErrorDetails = {
  reason?: string;
  provider?: string;
  fieldErrors?: Record<string, string[]>;
  vercelMessage?: string;
  [key: string]: unknown;
};

export const DEFAULT_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
  INVALID_SIGNATURE: 401,
  PAYLOAD_TOO_LARGE: 413,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;
  readonly retriable: boolean;

  constructor(
    code: ErrorCode,
    statusOrMessage: number | string,
    messageOrDetails?: string | ErrorDetails,
    detailsOrRetriable?: ErrorDetails | boolean,
    retriable: boolean = false,
  ) {
    let status: number;
    let message: string;
    let details: ErrorDetails | undefined;
    let isRetriable = retriable;

    if (typeof statusOrMessage === "number") {
      status = statusOrMessage;
      message = typeof messageOrDetails === "string" ? messageOrDetails : String(statusOrMessage);
      details = typeof detailsOrRetriable === "object" ? detailsOrRetriable : undefined;
      isRetriable = typeof detailsOrRetriable === "boolean" ? detailsOrRetriable : retriable;
    } else {
      status = DEFAULT_STATUS_MAP[code] ?? 500;
      message = statusOrMessage;
      details = typeof messageOrDetails === "object" ? (messageOrDetails as ErrorDetails) : undefined;
      isRetriable = typeof detailsOrRetriable === "boolean" ? detailsOrRetriable : false;
    }

    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retriable = isRetriable;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function reasonOf(err: unknown): string | undefined {
  if (isAppError(err) && err.details?.reason) {
    return err.details.reason;
  }
  return undefined;
}
