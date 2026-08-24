import type { OrgRole } from "@prisma/client";

export type Permission =
  | "org.manage"
  | "org.invite"
  | "project.create"
  | "project.view_all"
  | "project.view_assigned"
  | "expense.create"
  | "expense.edit_own"
  | "expense.delete"
  | "payment.create"
  | "payment.edit_own"
  | "payment.delete"
  | "financial.view"
  | "shop.sales"
  | "shop.inventory.manage"
  | "shop.purchase.manage"
  | "shop.purchase.view"
  | "shop.expense.manage"
  | "shop.expense.view"
  | "shop.profit.view"
  | "shop.activity.view"
  | "report.export"
  | "audit.view"
  | "vendor.manage"
  | "document.upload"
  | "settings.manage"
  | "staff.view"
  | "staff.manage"
  | "attendance.mark"
  | "attendance.view_own"
  | "payroll.manage";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  OWNER: [
    "org.manage",
    "org.invite",
    "project.create",
    "project.view_all",
    "expense.create",
    "expense.edit_own",
    "expense.delete",
    "payment.create",
    "payment.edit_own",
    "payment.delete",
    "financial.view",
    "shop.sales",
    "shop.inventory.manage",
    "shop.purchase.manage",
    "shop.purchase.view",
    "shop.expense.manage",
    "shop.expense.view",
    "shop.profit.view",
    "shop.activity.view",
    "report.export",
    "audit.view",
    "vendor.manage",
    "document.upload",
    "settings.manage",
    "staff.view",
    "staff.manage",
    "attendance.mark",
    "payroll.manage",
  ],
  PARTNER: [
    "project.view_assigned",
    "expense.create",
    "expense.edit_own",
    "payment.create",
    "payment.edit_own",
    "financial.view",
    "shop.sales",
    "shop.inventory.manage",
    "shop.purchase.view",
    "shop.expense.view",
    "shop.profit.view",
    "report.export",
    "audit.view",
    "vendor.manage",
    "document.upload",
    "staff.view",
  ],
  ACCOUNTANT: [
    "project.view_all",
    "expense.create",
    "expense.edit_own",
    "payment.create",
    "payment.edit_own",
    "financial.view",
    "shop.sales",
    "shop.inventory.manage",
    "shop.purchase.view",
    "shop.expense.view",
    "shop.profit.view",
    "report.export",
    "audit.view",
    "vendor.manage",
    "document.upload",
    "staff.view",
    "staff.manage",
    "attendance.mark",
    "payroll.manage",
  ],
  VIEWER: ["project.view_assigned", "financial.view", "staff.view"],
  CASHIER: [],
};

export function canManageShopPurchases(role: OrgRole): boolean {
  return hasPermission(role, "shop.purchase.manage");
}

export function canViewShopPurchases(role: OrgRole): boolean {
  return (
    hasPermission(role, "shop.purchase.view") ||
    hasPermission(role, "shop.purchase.manage")
  );
}

export function canManageShopExpenses(role: OrgRole): boolean {
  return hasPermission(role, "shop.expense.manage");
}

export function canViewShopExpenses(role: OrgRole): boolean {
  return (
    hasPermission(role, "shop.expense.view") ||
    hasPermission(role, "shop.expense.manage")
  );
}

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageOrg(role: OrgRole): boolean {
  return hasPermission(role, "org.manage");
}

export function canViewAllProjects(role: OrgRole): boolean {
  return hasPermission(role, "project.view_all");
}

export function canCreateProject(role: OrgRole): boolean {
  return hasPermission(role, "project.create");
}

export function canWriteFinancials(role: OrgRole): boolean {
  return (
    hasPermission(role, "expense.create") || hasPermission(role, "payment.create")
  );
}

export function canAccessProjectsNav(role: OrgRole): boolean {
  return (
    hasPermission(role, "project.view_all") ||
    hasPermission(role, "project.view_assigned")
  );
}

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: "Owner",
  PARTNER: "Partner",
  ACCOUNTANT: "Accountant",
  VIEWER: "Viewer",
  CASHIER: "Cashier",
};
