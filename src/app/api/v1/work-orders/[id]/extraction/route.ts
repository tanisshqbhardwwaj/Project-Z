import {
  getAuthContext,
  handleApi,
  apiSuccess,
  requirePermission,
  requireProjectWriteAccess,
} from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  acceptExtraction,
  getOrgScopedExtraction,
  rerunExtraction,
} from "@/services/extraction.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "document.upload");

    const extraction = await getOrgScopedExtraction(id, ctx.organizationId);
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
      requirePermission(ctx, "document.upload");
      await enforceRateLimit(
        request,
        "work-order:rerun",
        RATE_LIMITS.aiRerun.limit,
        RATE_LIMITS.aiRerun.windowMs
      );
      await rerunExtraction(id, ctx.organizationId);
      const extraction = await getOrgScopedExtraction(id, ctx.organizationId);
      return apiSuccess(serializeBigInt(extraction));
    }

    requireProjectWriteAccess(ctx);
    requirePermission(ctx, "project.create");

    const project = await acceptExtraction({
      extractionId: id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      corrections: body.corrections ?? {},
    });

    return apiSuccess(serializeBigInt(project));
  });
}
