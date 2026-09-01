"use client";

import type { OrgRole } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permissions/rbac";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";

/** Owner / partner UI — full shop back-office controls. */
export function useShopStaffUi() {
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const businessType = useAuthStore((s) => s.activeBusinessType);
  const { access, isRealCashier } = useCashierMode();

  const hasFullShopAccess =
    role === "OWNER" ||
    (!shopStaffAccessApplies({ role, businessType }) &&
      !!role &&
      hasPermission(role, "shop.sales"));

  const isStaffLimitedView = isRealCashier;

  return {
    access,
    isRealCashier,
    isStaffLimitedView,
    hasFullShopAccess,
    canViewCustomers: hasFullShopAccess,
    canEditInvoiceSettings: hasFullShopAccess,
    canCreateInvoice: hasFullShopAccess || access.canBill,
    canViewCustomerDetails: hasFullShopAccess,
    canPrintFullInvoice: hasFullShopAccess,
    canProcessReturns: hasFullShopAccess || access.canProcessReturns,
    canViewOwnSales: hasFullShopAccess || access.canViewOwnSales,
    canViewOwnAttendance: hasFullShopAccess || access.canViewOwnAttendance,
  };
}
