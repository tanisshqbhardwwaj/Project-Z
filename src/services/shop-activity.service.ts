import { prisma } from "@/lib/db/prisma";
import { ORG_ROLE_LABELS } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

const SHOP_ENTITY_PREFIXES = [
  "Shop",
  "Inventory",
  "CustomerCredit",
];

const SHOP_ACTION_PREFIX = "shop.";

export async function getShopActivityLogs(input: {
  organizationId: string;
  search?: string;
  module?: string;
  limit?: number;
  cursor?: string;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: input.organizationId,
      AND: [
        {
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
        },
        ...(input.search?.trim()
          ? [
              {
                OR: [
                  { action: { contains: input.search.trim() } },
                  { entityType: { contains: input.search.trim() } },
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
    take: limit,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  return logs.map((log) => {
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
}

function deriveModule(action: string, entityType: string): string {
  if (action.includes("purchase") || entityType === "ShopPurchase") return "Purchases";
  if (action.includes("expense") || entityType === "ShopExpense") return "Expenses";
  if (action.includes("inventory") || entityType === "InventoryItem") return "Inventory";
  if (action.includes("sale") || entityType === "ShopSale") return "Invoices";
  if (action.includes("credit") || action.includes("udhaar") || entityType === "CustomerCredit") return "Udhaar";
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
