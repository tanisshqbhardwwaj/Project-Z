import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { parseShopDashboardPeriod } from "@/lib/shop/dashboard-period";
import { getShopBranchContext } from "@/lib/shop/branch-context";
import { requireModule } from "@/lib/org/require-module";
import { getServiceDashboard } from "@/services/service/dashboard.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "service.appointments.manage") &&
      !hasPermission(ctx.role, "service.commission.view")
    ) {
      requirePermission(ctx, "service.appointments.manage");
    }
    await requireModule(ctx.organizationId, "service_appointments");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const { period, date, from, to } = parseShopDashboardPeriod(
      searchParams.get("period"),
      searchParams.get("date"),
      searchParams.get("from"),
      searchParams.get("to")
    );
    const data = await getServiceDashboard(ctx.organizationId, period, date, {
      from,
      to,
    }, shopCtx.branchId);
    return apiSuccess(serializeBigInt(data));
  });
}
