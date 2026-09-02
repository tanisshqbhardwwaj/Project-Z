import { getAuthContext, handleApi, requireProjectAccess, apiSuccess } from "@/lib/api/context";
import { getProjectSummary } from "@/services/projects/project.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const result = await getProjectSummary(id, ctx.organizationId);
    return apiSuccess(serializeBigInt(result));
  });
}
