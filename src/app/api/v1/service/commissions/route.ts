import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { listServiceCommissions } from "@/services/service/commissions.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.commission.view");
    await requireModule(ctx.organizationId, "service_commissions");
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const data = await listServiceCommissions({
      organizationId: ctx.organizationId,
      staffId: searchParams.get("staffId") ?? undefined,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    });
    return apiSuccess(serializeBigInt(data));
  });
}
