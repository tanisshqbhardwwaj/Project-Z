import type { OrgRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  ScanBarcode,
  ScanLine,
  RotateCcw,
  FileText,
  CalendarDays,
  User,
  Cloud,
  Package,
  UsersRound,
  BarChart3,
  MapPin,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions/rbac";
import type { StaffAccess } from "@/lib/staff/access";
import { defaultStaffAccess } from "@/lib/staff/access";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";
import { staffHomePath } from "@/lib/org/org-invites";

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
    canManageInventory: false,
    canViewAllAttendance: false,
    canViewAllSales: false,
    canViewOwnDeliveries: false,
    canUpdateDeliveryStatus: false,
  };
}

export function resolveCashierAccess(input: {
  role: OrgRole | null;
  linkedStaffAccess: StaffAccess;
  previewMode: boolean;
  isShopkeeper: boolean;
  businessType?: string | null;
}): StaffAccess | null {
  if (
    shopStaffAccessApplies({
      role: input.role,
      businessType: input.businessType ?? (input.isShopkeeper ? "SHOPKEEPER" : null),
    })
  ) {
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

/** Simplified shell for counter/staff (or owner preview). Shop non-owners always use it. */
export function isCashierExperience(input: {
  role: OrgRole | null;
  previewMode: boolean;
  isShopkeeper: boolean;
  businessType?: string | null;
}): boolean {
  if (
    shopStaffAccessApplies({
      role: input.role,
      businessType: input.businessType ?? (input.isShopkeeper ? "SHOPKEEPER" : null),
    })
  ) {
    return true;
  }
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

  items.push({
    href: "/staff/scan",
    label: "Scan Staff",
    key: "cashier_staff_scan",
    icon: ScanLine,
    description: "Barcode check-in and check-out",
  });

  if (access.canViewOwnAttendance) {
    items.push({
      href: "/staff/me",
      label: "My attendance",
      key: "cashier_attendance",
      icon: CalendarDays,
      description: "Mark and view your days",
    });
  }

  if (access.canViewAllAttendance) {
    items.push({
      href: "/staff",
      label: "Staff attendance",
      key: "cashier_all_attendance",
      icon: UsersRound,
      description: "View team attendance",
    });
  }

  if (access.canViewAllSales) {
    items.push({
      href: "/shop/reports",
      label: "Staff sales",
      key: "cashier_all_sales",
      icon: BarChart3,
      description: "Sales by staff member",
    });
  }

  if (access.canManageInventory) {
    items.push({
      href: "/shop/inventory",
      label: "Inventory",
      key: "cashier_inventory",
      icon: Package,
      description: "Manage stock and catalog",
    });
  }

  if (access.canViewOwnDeliveries || access.canUpdateDeliveryStatus) {
    items.push({
      href: "/deliveries/me",
      label: "My deliveries",
      key: "cashier_deliveries",
      icon: MapPin,
      description: "Assigned delivery runs",
    });
  }

  items.push({
    href: "/settings/storage",
    label: "Storage & Sync",
    key: "cashier_storage",
    icon: Cloud,
    description: "Cloud backup space and pending uploads",
  });

  items.push({
    href: "/settings/profile",
    label: "Profile",
    key: "cashier_profile",
    icon: User,
    description: "Your account",
  });

  return items;
}

export function cashierHomePath(access: StaffAccess): string {
  return staffHomePath(access);
}

const ALWAYS_ALLOWED = [
  "/cashier",
  "/settings/profile",
  "/settings/storage",
  "/staff/scan",
];

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

  if (access.canViewAllAttendance) {
    if (pathname === "/staff" || pathname.startsWith("/staff/")) {
      if (pathname === "/staff/me" || pathname.startsWith("/staff/me/")) {
        return access.canViewOwnAttendance;
      }
      return true;
    }
  }

  if (access.canViewAllSales) {
    if (pathname === "/shop/reports" || pathname.startsWith("/shop/reports/")) {
      return true;
    }
  }

  if (access.canManageInventory) {
    if (pathname === "/shop/inventory" || pathname.startsWith("/shop/inventory/")) {
      return true;
    }
  }

  if (access.canViewOwnDeliveries || access.canUpdateDeliveryStatus) {
    if (pathname === "/deliveries/me" || pathname.startsWith("/deliveries/me/")) {
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
  if (access.canViewAllAttendance) lines.push("View all staff attendance");
  if (access.canViewAllSales) lines.push("View sales by all staff");
  if (access.canManageInventory) lines.push("Manage inventory");
  if (access.canViewOwnDeliveries) lines.push("View assigned deliveries");
  if (
    !access.canBill &&
    !access.canProcessReturns &&
    !access.canViewOwnSales &&
    !access.canViewOwnAttendance &&
    !access.canViewAllAttendance &&
    !access.canViewAllSales &&
    !access.canManageInventory &&
    !access.canViewOwnDeliveries
  ) {
    lines.push("No permissions yet — owner must enable login access on Staff");
  }
  return lines;
}

export const CASHIER_HOME_ICON = LayoutDashboard;
