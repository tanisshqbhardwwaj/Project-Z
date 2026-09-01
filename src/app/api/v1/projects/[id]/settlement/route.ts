import { getAuthContext, handleApi, requireProjectAccess, apiSuccess } from "@/lib/api/context";
import { getProjectSettlement } from "@/services/projects/settlement.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const settlement = await getProjectSettlement(id, ctx.organizationId);
    return apiSuccess(serializeBigInt(settlement));
  });
}
