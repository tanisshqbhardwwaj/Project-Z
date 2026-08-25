import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { getInventoryAnalytics } from "@/services/shop.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.inventory.manage");
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const salesDays = daysParam ? Number(daysParam) : 30;

    const analytics = await getInventoryAnalytics(ctx.organizationId, salesDays);
    return apiSuccess(analytics);
  });
}
