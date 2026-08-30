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
import { getStaffSalesInvoices } from "@/services/shop.service";
import { requireAllSalesRead, allSalesStaffScope } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireAllSalesRead(ctx);
    const staffScope = await allSalesStaffScope(ctx);
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
    const staffName = searchParams.get("staffName")?.trim();
    if (!staffName) {
      throw new Error("staffName is required");
    }
    const data = await getStaffSalesInvoices(
      ctx.organizationId,
      period,
      staffName,
      date,
      from && to ? { from, to } : undefined,
      shopCtx.branchId
    );
    return apiSuccess(serializeBigInt(data));
  });
}
