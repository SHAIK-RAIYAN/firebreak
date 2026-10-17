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

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;
  readonly retriable: boolean;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details?: ErrorDetails,
    retriable: boolean = false,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retriable = retriable;
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
