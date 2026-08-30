import {
  resolveShopDashboardBounds,
  type ShopDashboardPeriod,
} from "@/lib/shop/dashboard-period";
import { isBranchAll } from "@/lib/shop/branch-context";
import { getServiceDashboardSummary } from "./service-dashboard.service";

export async function getServiceDashboard(
  organizationId: string,
  period: ShopDashboardPeriod,
  date: string | null,
  range: { from?: string | null; to?: string | null },
  branchId?: string
) {
  const bounds = resolveShopDashboardBounds(period, date, range);

  return getServiceDashboardSummary({
    organizationId,
    branchId: branchId && !isBranchAll(branchId) ? branchId : undefined,
    revenueFrom: bounds.start,
    revenueTo: bounds.end,
  });
}

export {
  getServiceDashboardSummary,
  getServiceDashboardTodayBookings,
  getServiceDashboardStaffLoad,
  getServiceDashboardRevenueByService,
  getServiceDashboardRenewals,
} from "./service-dashboard.service";
