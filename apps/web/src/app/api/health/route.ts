import { NextResponse } from "next/server";
import { db } from "@firebreak/core";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = db();
    await database.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: err.message,
      },
      { status: 500 },
    );
  }
}
