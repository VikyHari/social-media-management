import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + database readiness. Never leaks error details to the client.
 */
export async function GET() {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      dbLatencyMs: Date.now() - startedAt,
      timestamp,
    });
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json({ status: "degraded", db: "error", timestamp }, { status: 503 });
  }
}
