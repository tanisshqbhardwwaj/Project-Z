import type { OrgRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  ScanBarcode,
  RotateCcw,
  FileText,
  CalendarDays,
  User,
<<<<<<< HEAD
  Cloud,
=======
>>>>>>> origin/master
} from "lucide-react";
import { hasPermission } from "@/lib/permissions/rbac";
import type { StaffAccess } from "@/lib/staff/access";
import { defaultStaffAccess } from "@/lib/staff/access";

export type CashierNavItem = {
  href: string;
  label: string;
  key: string;
  icon: LucideIcon;
  description?: string;
};

/** Owner preview shows a typical cashier setup (all counter toggles on). */
export function previewCashierAccess(): StaffAccess {
  return {
    canBill: true,
    canProcessReturns: true,
    canViewOwnSales: true,
    canViewOwnAttendance: true,
  };
}

export function resolveCashierAccess(input: {
  role: OrgRole | null;
  linkedStaffAccess: StaffAccess;
  previewMode: boolean;
  isShopkeeper: boolean;
}): StaffAccess | null {
  if (input.role === "CASHIER") {
    return input.linkedStaffAccess;
  }
  if (
    input.previewMode &&
    input.isShopkeeper &&
    input.role &&
    hasPermission(input.role, "shop.sales")
  ) {
    return previewCashierAccess();
  }
  return null;
}

/** Simplified shell for counter staff (or owner preview). */
export function isCashierExperience(input: {
  role: OrgRole | null;
  previewMode: boolean;
  isShopkeeper: boolean;
}): boolean {
  if (input.role === "CASHIER" && input.isShopkeeper) return true;
  if (
    input.previewMode &&
    input.isShopkeeper &&
    input.role &&
    hasPermission(input.role, "shop.sales")
  ) {
    return true;
  }
  return false;
}

export function cashierNavItems(access: StaffAccess): CashierNavItem[] {
  const items: CashierNavItem[] = [];

  if (access.canBill) {
    items.push({
      href: "/shop/invoices/new",
      label: "New bill",
      key: "cashier_bill",
      icon: Receipt,
      description: "Scan items, apply offers, take payment",
    });
    items.push({
      href: "/shop/scan",
      label: "Scan",
      key: "cashier_scan",
      icon: ScanBarcode,
      description: "Barcode lookup and quick add",
    });
  }

  if (access.canProcessReturns) {
    items.push({
      href: "/shop/returns",
      label: "Returns",
      key: "cashier_returns",
      icon: RotateCcw,
      description: "Return or exchange with bill",
    });
  }

  if (access.canViewOwnSales) {
    items.push({
      href: "/shop/invoices",
      label: "My bills",
      key: "cashier_my_bills",
      icon: FileText,
      description: "Invoices you created",
    });
  }

  if (access.canViewOwnAttendance) {
    items.push({
      href: "/staff/me",
      label: "My attendance",
      key: "cashier_attendance",
      icon: CalendarDays,
      description: "Mark and view your days",
    });
  }

  items.push({
<<<<<<< HEAD
    href: "/settings/storage",
    label: "Storage & Sync",
    key: "cashier_storage",
    icon: Cloud,
    description: "Cloud backup space and pending uploads",
  });

  items.push({
=======
>>>>>>> origin/master
    href: "/settings/profile",
    label: "Profile",
    key: "cashier_profile",
    icon: User,
    description: "Your account",
  });

  return items;
}

export function cashierHomePath(access: StaffAccess): string {
  if (access.canBill) return "/shop/invoices/new";
  if (access.canViewOwnSales) return "/shop/invoices";
  if (access.canProcessReturns) return "/shop/returns";
  if (access.canViewOwnAttendance) return "/staff/me";
  return "/cashier";
}

<<<<<<< HEAD
const ALWAYS_ALLOWED = ["/cashier", "/settings/profile", "/settings/storage"];
=======
const ALWAYS_ALLOWED = ["/cashier", "/settings/profile"];
>>>>>>> origin/master

export function isCashierRouteAllowed(
  pathname: string,
  access: StaffAccess
): boolean {
  if (ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }

  if (access.canBill) {
    if (pathname === "/shop/invoices/new" || pathname.startsWith("/shop/invoices/new/")) {
      return true;
    }
    if (pathname === "/shop/scan" || pathname.startsWith("/shop/scan/")) {
      return true;
    }
  }

  if (access.canBill || access.canViewOwnSales) {
    if (pathname === "/shop/invoices" || pathname.startsWith("/shop/invoices/")) {
      return (
        pathname !== "/shop/invoices/settings" &&
        !pathname.startsWith("/shop/invoices/settings/")
      );
    }
  }

  if (access.canProcessReturns) {
    if (pathname === "/shop/returns" || pathname.startsWith("/shop/returns/")) {
      return true;
    }
  }

  if (access.canViewOwnAttendance) {
    if (pathname === "/staff/me" || pathname.startsWith("/staff/me/")) {
      return true;
    }
  }

  return false;
}

export function emptyCashierAccess(): StaffAccess {
  return defaultStaffAccess();
}

export function cashierModeSummary(access: StaffAccess): string[] {
  const lines: string[] = [];
  if (access.canBill) lines.push("Create bills and scan barcodes");
  else lines.push("Billing — ask owner to enable on your staff profile");
  if (access.canProcessReturns) lines.push("Process returns and exchanges");
  if (access.canViewOwnSales) lines.push("View invoices you created");
  if (access.canViewOwnAttendance) lines.push("Mark and view your attendance");
  if (
    !access.canBill &&
    !access.canProcessReturns &&
    !access.canViewOwnSales &&
    !access.canViewOwnAttendance
  ) {
    lines.push("No permissions yet — owner must enable login access on Staff");
  }
  return lines;
}

export const CASHIER_HOME_ICON = LayoutDashboard;
