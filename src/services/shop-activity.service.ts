import { prisma } from "@/lib/db/prisma";
import { ORG_ROLE_LABELS } from "@/lib/permissions/rbac";
import type { OrgRole, Prisma } from "@prisma/client";
<<<<<<< HEAD
import { toCursorPage, type CursorPage } from "@/lib/api/cursor-page";
=======
>>>>>>> origin/master

const SHOP_ENTITY_PREFIXES = ["Shop", "Inventory", "CustomerCredit"];

const SHOP_ACTION_PREFIX = "shop.";

export const ACTIVITY_MODULE_FILTERS = [
  "all",
  "invoices",
  "inventory",
  "purchases",
  "expenses",
  "udhaar",
  "returns",
  "offers",
  "staff",
] as const;

export type ActivityModuleFilter = (typeof ACTIVITY_MODULE_FILTERS)[number];

export type ActivityDatePreset = "today" | "week" | "month" | "custom" | "all";

function moduleWhere(module: ActivityModuleFilter): Prisma.AuditLogWhereInput | null {
  switch (module) {
    case "all":
      return null;
    case "invoices":
      return {
        OR: [
          { action: { contains: "sale" } },
          { action: { contains: "hold_bill" } },
          { entityType: "ShopSale" },
        ],
      };
    case "inventory":
      return {
        OR: [
          { action: { contains: "inventory" } },
          { action: { contains: "product" } },
          { entityType: "InventoryItem" },
        ],
      };
    case "purchases":
      return {
        OR: [{ action: { contains: "purchase" } }, { entityType: "ShopPurchase" }],
      };
    case "expenses":
      return {
        OR: [
          { action: { contains: "expense" } },
          { action: { contains: "recurring_expense" } },
          { entityType: "ShopExpense" },
        ],
      };
    case "udhaar":
      return {
        OR: [
          { action: { contains: "credit" } },
          { action: { contains: "udhaar" } },
          { entityType: "CustomerCredit" },
        ],
      };
    case "returns":
      return {
        OR: [{ action: { contains: "return" } }, { action: { contains: "exchange" } }],
      };
    case "offers":
      return { action: { contains: "offer" } };
    case "staff":
      return { action: { contains: "staff" } };
    default:
      return null;
  }
}

function resolveDateRange(input: {
  preset?: ActivityDatePreset;
  from?: string;
  to?: string;
}): { gte?: Date; lte?: Date } | null {
  const preset = input.preset ?? "all";
  if (preset === "all") return null;

  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (preset === "today") {
    return { gte: startOfDay(now), lte: endOfDay(now) };
  }
  if (preset === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { gte: startOfDay(from), lte: endOfDay(now) };
  }
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: startOfDay(from), lte: endOfDay(now) };
  }
  if (preset === "custom" && (input.from || input.to)) {
    const gte = input.from ? startOfDay(new Date(input.from)) : undefined;
    const lte = input.to ? endOfDay(new Date(input.to)) : undefined;
    if (gte && Number.isNaN(gte.getTime())) return null;
    if (lte && Number.isNaN(lte.getTime())) return null;
    return { gte, lte };
  }
  return null;
}

export async function getShopActivityLogs(input: {
  organizationId: string;
  search?: string;
  module?: ActivityModuleFilter;
  datePreset?: ActivityDatePreset;
  from?: string;
  to?: string;
  userId?: string;
  limit?: number;
  cursor?: string;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const search = input.search?.trim();
  const moduleFilter = input.module && input.module !== "all" ? input.module : null;
  const dateRange = resolveDateRange({
    preset: input.datePreset,
    from: input.from,
    to: input.to,
  });

  const baseShopFilter: Prisma.AuditLogWhereInput = {
    OR: [
      { action: { startsWith: SHOP_ACTION_PREFIX } },
      {
        entityType: {
          in: [
            "InventoryItem",
            "ShopSale",
            "ShopPurchase",
            "ShopExpense",
            "CustomerCredit",
            "ShopSupplier",
          ],
        },
      },
    ],
  };

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: input.organizationId,
      AND: [
        baseShopFilter,
        ...(moduleFilter ? [moduleWhere(moduleFilter)!] : []),
        ...(dateRange
          ? [
              {
                createdAt: {
                  ...(dateRange.gte ? { gte: dateRange.gte } : {}),
                  ...(dateRange.lte ? { lte: dateRange.lte } : {}),
                },
              },
            ]
          : []),
        ...(input.userId ? [{ userId: input.userId }] : []),
        ...(search
          ? [
              {
                OR: [
                  { action: { contains: search } },
                  { entityType: { contains: search } },
                  { user: { name: { contains: search } } },
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          organizationMembers: {
            where: { organizationId: input.organizationId },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
<<<<<<< HEAD
    take: search ? Math.min(200, (limit + 1) * 2) : limit + 1,
=======
    take: search ? Math.min(200, limit * 2) : limit,
>>>>>>> origin/master
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let rows = logs.map((log) => {
    const role = log.user.organizationMembers[0]?.role as OrgRole | undefined;
    return {
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      userRole: role ? ORG_ROLE_LABELS[role] : "Unknown",
      action: log.action,
      module: deriveModule(log.action, log.entityType),
      description: formatActivityDescription(log.action, log.before, log.after),
      entityType: log.entityType,
      entityId: log.entityId,
      createdAt: log.createdAt.toISOString(),
    };
  });

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.action.toLowerCase().includes(q) ||
        row.entityType.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.module.toLowerCase().includes(q)
    );
<<<<<<< HEAD
    rows = rows.slice(0, limit + 1);
  }

  return toCursorPage(rows, limit);
=======
    rows = rows.slice(0, limit);
  }

  return rows;
>>>>>>> origin/master
}

export async function getShopActivityActors(organizationId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      action: { startsWith: SHOP_ACTION_PREFIX },
    },
    distinct: ["userId"],
    select: {
      userId: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return logs.map((l) => ({
    id: l.user.id,
    name: l.user.name,
  }));
}

function deriveModule(action: string, entityType: string): string {
  if (action.includes("return") || action.includes("exchange")) return "Returns";
  if (action.includes("offer")) return "Offers";
  if (action.includes("purchase") || entityType === "ShopPurchase") return "Purchases";
  if (action.includes("expense") || entityType === "ShopExpense") return "Expenses";
  if (action.includes("inventory") || entityType === "InventoryItem") return "Inventory";
  if (action.includes("sale") || action.includes("hold_bill") || entityType === "ShopSale")
    return "Invoices";
  if (action.includes("credit") || action.includes("udhaar") || entityType === "CustomerCredit")
    return "Udhaar";
  if (action.includes("supplier") || entityType === "ShopSupplier") return "Suppliers";
  if (action.includes("staff")) return "Staff";
  return "Shop";
}

function formatActivityDescription(
  action: string,
  before: unknown,
  after: unknown
): string {
  const afterObj = (after ?? {}) as Record<string, unknown>;
  const beforeObj = (before ?? {}) as Record<string, unknown>;

  switch (action) {
    case "shop.sale.created":
      return `Invoice created · Bill ${String(afterObj.billNumber ?? "—")}`;
    case "shop.purchase.created":
      return `Purchase recorded · ${String(afterObj.billNumber ?? afterObj.id ?? "")}`;
    case "shop.purchase.updated":
      return "Purchase updated";
    case "shop.purchase.cancelled":
      return "Purchase cancelled";
    case "shop.expense.created":
      return `Expense: ${String(afterObj.title ?? "")} · ₹${Number(afterObj.amountPaise ?? 0) / 100}`;
    case "shop.expense.updated":
      return `Expense updated: ${String(afterObj.title ?? "")}`;
    case "shop.expense.deleted":
      return `Expense deleted: ${String(beforeObj.title ?? "")}`;
    case "shop.inventory.created":
    case "shop.inventory.updated":
      return `Product: ${String(afterObj.name ?? beforeObj.name ?? "")}`;
    case "shop.inventory.deleted":
      return `Product deleted: ${String(beforeObj.name ?? "")}`;
    case "shop.udhaar.adjusted":
    case "shop.credit.payment_recorded":
      return "Customer credit updated";
    case "shop.return.created":
      return `Return processed · ${String(afterObj.returnNumber ?? "")}`;
    case "shop.exchange.created":
      return `Exchange processed · ${String(afterObj.returnNumber ?? "")}`;
    case "shop.hold_bill.created":
      return `Hold bill #${String(afterObj.holdNumber ?? "")} created`;
    case "shop.hold_bill.resumed":
      return `Hold bill #${String(afterObj.holdNumber ?? beforeObj.holdNumber ?? "")} resumed`;
    case "shop.hold_bill.cancelled":
      return `Hold bill #${String(beforeObj.holdNumber ?? "")} cancelled`;
    case "shop.hold_bill.expired":
      return `Hold bill #${String(afterObj.holdNumber ?? "")} expired`;
    case "shop.offer.created":
      return `Offer created · ${String(afterObj.name ?? "")}`;
    case "shop.offer.updated":
    case "shop.offer.deactivated":
      return `Offer updated · ${String(afterObj.name ?? beforeObj.name ?? "")}`;
    case "shop.offer.deleted":
      return `Offer deleted · ${String(beforeObj.name ?? "")}`;
    default:
      return action.replace(/\./g, " · ");
  }
}

export { SHOP_ENTITY_PREFIXES };
