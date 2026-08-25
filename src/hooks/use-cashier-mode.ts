"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { OrgRole } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import {
  isCashierExperience,
  resolveCashierAccess,
  type CashierNavItem,
  cashierHomePath,
  cashierNavItems,
  emptyCashierAccess,
} from "@/lib/staff/cashier-mode";
import type { StaffAccess } from "@/lib/staff/access";
import {
  readCashierPreviewEnabled,
  subscribeCashierPreview,
  writeCashierPreviewEnabled,
} from "@/lib/staff/cashier-preview-storage";

export function useCashierMode() {
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);
  const linkedStaffAccess = useAuthStore((s) => s.linkedStaffAccess);
  const linkedStaffName = useAuthStore((s) => s.linkedStaffName);
  const isShopkeeper = activeBusinessType === "SHOPKEEPER";

  const previewMode = useSyncExternalStore(
    subscribeCashierPreview,
    readCashierPreviewEnabled,
    () => false
  );

  const setPreviewMode = useCallback((enabled: boolean) => {
    writeCashierPreviewEnabled(enabled);
  }, []);

  const active =
    isCashierExperience({ role, previewMode, isShopkeeper });

  const access: StaffAccess =
    resolveCashierAccess({
      role,
      linkedStaffAccess,
      previewMode,
      isShopkeeper,
    }) ?? emptyCashierAccess();

  const navItems: CashierNavItem[] = active ? cashierNavItems(access) : [];
  const homePath = active ? cashierHomePath(access) : "/dashboard";

  const isRealCashier = role === "CASHIER" && isShopkeeper;
  const isOwnerPreview = active && !isRealCashier && previewMode;

  return {
    active,
    access,
    navItems,
    homePath,
    previewMode,
    setPreviewMode,
    isRealCashier,
    isOwnerPreview,
    staffName: linkedStaffName,
  };
}
