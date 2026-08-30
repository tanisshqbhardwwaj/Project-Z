import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch-context";
import { requireModule } from "@/lib/org/require-module";
import { getAppointmentCalendar } from "@/services/service/appointments.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) {
      throw new Error("from and to query parameters are required");
    }
    const data = await getAppointmentCalendar({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      staffId: searchParams.get("staffId") ?? undefined,
      from: new Date(from),
      to: new Date(to),
    });
    return apiSuccess(serializeBigInt(data));
  });
}
