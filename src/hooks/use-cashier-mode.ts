"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { OrgRole } from "@prisma/client";
import {
  isCashierExperience,
  resolveCashierAccess,
  type CashierNavItem,
  cashierHomePath,
  cashierNavItems,
  emptyCashierAccess,
} from "@/lib/staff/cashier-mode";
import type { StaffAccess } from "@/lib/staff/access";
import { isShopVertical } from "@/lib/org/business-type";

export function useCashierMode() {
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);
  const linkedStaffAccess = useAuthStore((s) => s.linkedStaffAccess);
  const linkedStaffName = useAuthStore((s) => s.linkedStaffName);
  const isShopVerticalOrg = isShopVertical(activeBusinessType);

  const active = isCashierExperience({ role, isShopkeeper: isShopVerticalOrg });

  const access: StaffAccess =
    resolveCashierAccess({
      role,
      linkedStaffAccess,
      isShopkeeper: isShopVerticalOrg,
    }) ?? emptyCashierAccess();

  const navItems: CashierNavItem[] = active ? cashierNavItems(access) : [];
  const homePath = active ? cashierHomePath(access) : "/dashboard";

  const isRealCashier = role === "CASHIER" && isShopVerticalOrg;

  return {
    active,
    access,
    navItems,
    homePath,
    isRealCashier,
    staffName: linkedStaffName,
  };
}
