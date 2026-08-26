import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isInngestEnabled } from "@/inngest/client";

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: Record<string, "ok" | "degraded" | "error"> = {
    database: "error",
    inngest: isInngestEnabled() ? "ok" : "degraded",
    storage: process.env.R2_BUCKET || process.env.S3_BUCKET ? "ok" : "degraded",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const healthy = checks.database === "ok";

  return NextResponse.json(
    {
      data: {
        status: healthy ? "ok" : "degraded",
        timestamp,
        checks,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
