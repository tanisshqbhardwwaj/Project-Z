import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ data: { status: "ok", timestamp: new Date().toISOString() } });
  } catch {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Database connection failed" } },
      { status: 503 }
    );
  }
}
