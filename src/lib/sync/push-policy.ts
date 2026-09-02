import type { OrgRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions/rbac";
import { SYNC_KINDS, type SyncKind } from "@/lib/sync/kinds";

export const CASHIER_SYNC_KINDS: readonly SyncKind[] = [
  "sale.create",
  "return.create",
  "attendance.check_in",
  "attendance.check_out",
];

export function isSyncKind(kind: string): kind is SyncKind {
  return (SYNC_KINDS as readonly string[]).includes(kind);
}

export function cashierMayPushKind(kind: string): boolean {
  return CASHIER_SYNC_KINDS.includes(kind as SyncKind);
}

/** Pure matrix: which role may attempt a sync kind (cashiers also need staff toggles). */
export function roleMayPushKind(role: OrgRole, kind: string): boolean {
  if (!isSyncKind(kind)) return false;
  if (role === "CASHIER") return cashierMayPushKind(kind);
  if (role === "VIEWER") return false;

  const need: Record<SyncKind, Permission> = {
    "sale.create": "shop.sales",
    "return.create": "shop.sales",
    "customer.upsert": "shop.sales",
    "stock.adjust": "shop.inventory.manage",
    "purchase.create": "shop.purchase.manage",
    "expense.create": "shop.expense.manage",
    "udhaar.payment": "payment.create",
    "attendance.check_in": "attendance.mark",
    "attendance.check_out": "attendance.mark",
    "attendance.correct": "attendance.mark",
  };
  return hasPermission(role, need[kind]);
}
