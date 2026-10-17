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
    try {
      const sessionCtx = await getSession();
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
      return await handler(
        req,
        {
          ...sessionCtx,
          serviceCtx,
        },
        routeCtx,
      );
    } catch (err) {
      return apiError(err);
    }
  };
}
