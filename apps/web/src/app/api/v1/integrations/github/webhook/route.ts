import { NextResponse } from "next/server";
import { handleGithubWebhook } from "@firebreak/core";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const deliveryId = req.headers.get("x-github-delivery");

    const res = await handleGithubWebhook(rawBody, signature, deliveryId);
    return NextResponse.json({ data: res }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
