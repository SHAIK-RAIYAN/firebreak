import { type NextRequest, NextResponse } from "next/server";
import { ingestAlert, isAppError, newId, logger } from "@firebreak/core";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const requestId = req.headers.get("x-request-id") ?? newId("req");
  const { serviceId } = await params;

  try {
    const rawBody = await req.text();
    const result = await ingestAlert({
      serviceId,
      rawBody,
      headers: req.headers,
    });

    return NextResponse.json(
      { data: result.data },
      {
        status: result.status,
        headers: {
          "x-request-id": requestId,
          "cache-control": "no-store",
        },
      },
    );
  } catch (err: unknown) {
    if (isAppError(err)) {
      if (err.code === "INVALID_SIGNATURE") {
        return NextResponse.json(
          { error: { code: "INVALID_SIGNATURE" } },
          { status: 401, headers: { "x-request-id": requestId } },
        );
      }
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        },
        { status: err.status, headers: { "x-request-id": requestId } },
      );
    }

    logger.error({ err, requestId, serviceId }, "Unhandled error in alert intake");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
