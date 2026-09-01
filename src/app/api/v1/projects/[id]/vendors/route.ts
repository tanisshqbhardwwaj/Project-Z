import { getAuthContext, handleApi, requireProjectAccess, apiSuccess } from "@/lib/api/context";
import { listVendorsForProject } from "@/services/org/vendor.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);
    const vendors = await listVendorsForProject(id, ctx.organizationId);
    return apiSuccess(serializeBigInt(vendors));
  });
}
