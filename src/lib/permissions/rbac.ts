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
  | "report.export"
  | "audit.view"
  | "vendor.manage"
  | "document.upload"
  | "settings.manage";

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
    "report.export",
    "audit.view",
    "vendor.manage",
    "document.upload",
    "settings.manage",
  ],
  PARTNER: [
    "project.view_assigned",
    "expense.create",
    "expense.edit_own",
    "payment.create",
    "payment.edit_own",
    "financial.view",
    "report.export",
    "audit.view",
    "vendor.manage",
    "document.upload",
  ],
  ACCOUNTANT: [
    "project.view_all",
    "expense.create",
    "expense.edit_own",
    "payment.create",
    "payment.edit_own",
    "financial.view",
    "report.export",
    "audit.view",
    "vendor.manage",
    "document.upload",
  ],
  VIEWER: ["project.view_assigned", "financial.view"],
};

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
