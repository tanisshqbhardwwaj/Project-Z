import { NextResponse } from "next/server";
import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { acceptExtraction, rerunExtraction } from "@/services/extraction.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    await getAuthContext(request.headers.get("X-Organization-Id"));

    const extraction = await prisma.aIExtraction.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!extraction) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Extraction not found" } },
        { status: 404 }
      );
    }

    return apiSuccess(serializeBigInt(extraction));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const body = await request.json();

    if (body.action === "rerun") {
      await enforceRateLimit(request, "work-order:rerun", RATE_LIMITS.aiRerun.limit, RATE_LIMITS.aiRerun.windowMs);
      await rerunExtraction(id);
      const extraction = await prisma.aIExtraction.findUnique({ where: { id } });
      return apiSuccess(serializeBigInt(extraction));
    }

    const project = await acceptExtraction({
      extractionId: id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      corrections: body.corrections ?? {},
    });

    return apiSuccess(serializeBigInt(project));
  });
}
