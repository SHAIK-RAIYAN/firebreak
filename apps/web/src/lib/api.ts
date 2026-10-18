import { NextResponse } from "next/server";
import { getSession, type SessionContext } from "./session";
import { userCtx, AppError, type ServiceContext } from "@firebreak/core";

export type ApiHandlerContext = SessionContext & {
  serviceCtx: ServiceContext;
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      { status: err.status },
    );
  }

  const message = (err as Error)?.message || "Internal server error";
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL",
        message,
      },
    },
    { status: 500 },
  );
}

export function withAuth<T = unknown>(
  handler: (req: Request, ctx: ApiHandlerContext, routeCtx: T) => Promise<Response>,
) {
  return async (req: Request, routeCtx: T) => {
    const t0 = performance.now();
    try {
      const sessionCtx = await getSession();
      const tAuth = performance.now() - t0;
      if (!sessionCtx) {
        return NextResponse.json(
          {
            error: {
              code: "UNAUTHENTICATED",
              message: "Sign in required",
            },
          },
          { status: 401 },
        );
      }

      const serviceCtx = userCtx(sessionCtx.workspace.id, sessionCtx.user.id);
      const tAppStart = performance.now();
      const res = await handler(
        req,
        {
          ...sessionCtx,
          serviceCtx,
        },
        routeCtx,
      );
      const tApp = performance.now() - tAppStart;
      const tTotal = performance.now() - t0;

      // Inject Server-Timing header for transparent performance tracing in DevTools
      try {
        res.headers.set(
          "Server-Timing",
          `auth;dur=${tAuth.toFixed(1)}, app;dur=${tApp.toFixed(1)}, total;dur=${tTotal.toFixed(1)}`,
        );
      } catch {
        // Ignore immutable response header errors
      }

      return res;
    } catch (err) {
      return apiError(err);
    }
  };
}
