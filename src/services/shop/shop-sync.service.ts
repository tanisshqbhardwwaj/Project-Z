import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { ApiError, type AuthContext } from "@/lib/api/context";
import { subscriptionAllowsCloudSync } from "@/lib/billing/entitlements";
import { assertSyncPushKindAllowed } from "@/lib/sync/authorize-push";
import { getStorageUsageBreakdown } from "@/services/shared/storage-quota.service";
import { createShopSale } from "@/services/shop/shop.service";
import { processReturn } from "@/services/shop/shop-return.service";
import { recordCustomerPayment } from "@/services/shop/shop-credit.service";
import { createShopExpense } from "@/services/shop/shop-expense.service";
import { createShopPurchase } from "@/services/shop/shop-purchase.service";
import { upsertCustomerRaw } from "@/lib/shop/customers/customer-store";
import { parseShopInvoiceSettings } from "@/lib/org/shop-settings";
import { fiscalYearLabel, resolveStoreCode } from "@/lib/shop/invoices/bill-number";
import { ensureSyncSchema } from "@/lib/shop/schema/ensure-sync-schema";
import { resolveBranchId } from "@/lib/shop/branch/branch-context";
import type { SyncKind, SyncPullSnapshot, SyncPushResult } from "@/lib/sync/kinds";

function sinceDate(since: string | null, windowDays: number): Date {
  if (since) {
    const parsed = new Date(since);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const d = new Date();
  d.setDate(d.getDate() - windowDays);
  return d;
}

async function alreadyApplied(organizationId: string, id: string) {
  const row = await prisma.syncMutation.findUnique({ where: { id } }).catch(() => null);
  return row?.organizationId === organizationId ? row : null;
}

export async function applySyncPush(input: {
  ctx: AuthContext;
  deviceId?: string | null;
  items: { id: string; kind: string; payload: Record<string, unknown> }[];
}): Promise<SyncPushResult[]> {
  await ensureSyncSchema();
  const results: SyncPushResult[] = [];

  for (const item of input.items) {
    try {
      await assertSyncPushKindAllowed(input.ctx, item.kind);
      const existing = await alreadyApplied(input.ctx.organizationId, item.id);
      if (existing) {
        results.push({
          id: item.id,
          status: "duplicate",
          entityId: existing.entityId ?? undefined,
        });
        continue;
      }

      const entityId = await applyOne({
        organizationId: input.ctx.organizationId,
        userId: input.ctx.userId,
        kind: item.kind as SyncKind,
        payload: item.payload,
        clientId: item.id,
      });

      await prisma.syncMutation.create({
        data: {
          id: item.id,
          organizationId: input.ctx.organizationId,
          deviceId: input.deviceId ?? null,
          kind: item.kind,
          entityId: entityId ?? null,
        },
      });

      results.push({ id: item.id, status: "applied", entityId: entityId ?? undefined });
    } catch (e) {
      results.push({
        id: item.id,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}

async function applyOne(input: {
  organizationId: string;
  userId: string;
  kind: SyncKind;
  payload: Record<string, unknown>;
  clientId: string;
}): Promise<string | null> {
  const p = input.payload;

  switch (input.kind) {
    case "sale.create": {
      if (typeof p.clientId === "string") {
        const dup = await prisma.shopSale.findFirst({
          where: { id: p.clientId, organizationId: input.organizationId },
          select: { id: true },
        });
        if (dup) return dup.id;
      }
      const branchId = await resolveBranchId(input.organizationId);
      const sale = await createShopSale({
        organizationId: input.organizationId,
        branchId,
        createdById: input.userId,
        clientId: typeof p.clientId === "string" ? p.clientId : input.clientId,
        customerId: (p.customerId as string | null) ?? null,
        customerName: (p.customerName as string | null) ?? null,
        customerPhone: (p.customerPhone as string | null) ?? null,
        customerGstin: (p.customerGstin as string | null) ?? null,
        staffId: (p.staffId as string | null) ?? null,
        salesBoyName: (p.salesBoyName as string | null) ?? null,
        billNumber: (p.billNumber as string | null) ?? null,
        issueInvoice: p.issueInvoice !== false,
        totalRupees: p.totalRupees as number | undefined,
        gstRupees: p.gstRupees as number | undefined,
        discountRupees: p.discountRupees as number | undefined,
        discountPercent: p.discountPercent as number | undefined,
        taxRatePercent: p.taxRatePercent as number | undefined,
        taxIncluded: p.taxIncluded as boolean | undefined,
        manualGstRupees: (p.manualGstRupees as number | null) ?? null,
        paymentMethod: p.paymentMethod as never,
        paidRupees: p.paidRupees as number | undefined,
        items: (p.items as never) ?? [],
        notes: (p.notes as string | null) ?? null,
        selectedOfferId: (p.selectedOfferId as string | null) ?? null,
        skipOffer: Boolean(p.skipOffer),
      });
      return sale.id;
    }
    case "return.create": {
      const row = await processReturn({
        organizationId: input.organizationId,
        userId: input.userId,
        shopSaleId: String(p.shopSaleId),
        type: (p.type as "RETURN" | "EXCHANGE") ?? "RETURN",
        reason: p.reason as never,
        notes: (p.notes as string | null) ?? null,
        refundMethod: p.refundMethod as never,
        lines: (p.lines as never) ?? [],
        exchangeItems: (p.exchangeItems as never) ?? [],
        staffId: (p.staffId as string | null) ?? null,
        staffName: (p.staffName as string | null) ?? null,
      });
      return row.id;
    }
    case "stock.adjust": {
      const itemId = String(p.inventoryItemId);
      const qty = Number(p.quantity);
      const item = await prisma.inventoryItem.findFirst({
        where: { id: itemId, organizationId: input.organizationId },
      });
      if (!item) throw new Error("Inventory item not found");
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: qty },
      });
      return itemId;
    }
    case "customer.upsert": {
      const customer = await upsertCustomerRaw(input.organizationId, {
        name: String(p.name ?? ""),
        phone: (p.phone as string | null) ?? null,
        gstin: (p.gstin as string | null) ?? null,
      });
      if (!customer) throw new Error("Customer name is required");
      return customer.id;
    }
    case "udhaar.payment": {
      const credit = await recordCustomerPayment({
        organizationId: input.organizationId,
        userId: input.userId,
        creditId: String(p.creditId),
        amountRupees: Number(p.amountRupees),
        paymentMethod: p.paymentMethod as never,
        notes: (p.notes as string | null) ?? null,
        shopSaleId: (p.shopSaleId as string | null) ?? null,
      });
      return credit.id;
    }
    case "purchase.create": {
      const purchase = await createShopPurchase({
        organizationId: input.organizationId,
        userId: input.userId,
        supplierId: String(p.supplierId),
        purchaseDate: new Date(String(p.purchaseDate)),
        billNumber: (p.billNumber as string | null) ?? null,
        lines: (p.lines as never) ?? [],
        discountRupees: p.discountRupees as number | undefined,
        taxRupees: p.taxRupees as number | undefined,
        extraChargesRupees: p.extraChargesRupees as number | undefined,
        paidRupees: p.paidRupees as number | undefined,
        paymentMethod: p.paymentMethod as never,
        notes: (p.notes as string | null) ?? null,
        idempotencyKey: (p.idempotencyKey as string | null) ?? input.clientId,
      });
      return purchase.id;
    }
    case "expense.create": {
      const expense = await createShopExpense({
        organizationId: input.organizationId,
        userId: input.userId,
        categoryId: String(p.categoryId),
        expenseDate: new Date(String(p.expenseDate)),
        title: String(p.title),
        description: (p.description as string | null) ?? null,
        amountRupees: Number(p.amountRupees),
        paymentMethod: p.paymentMethod as never,
        paidBy: (p.paidBy as string | null) ?? null,
        expenseType: p.expenseType as never,
        notes: (p.notes as string | null) ?? null,
      });
      return expense.id;
    }
    default:
      throw new ApiError(400, "UNKNOWN_KIND", `Unknown sync kind: ${input.kind}`);
  }
}

export async function applySyncKind(input: {
  organizationId: string;
  userId: string;
  kind: SyncKind;
  payload: Record<string, unknown>;
  clientId: string;
}): Promise<string | null> {
  return applyOne(input);
}

export async function pullShopSnapshot(input: {
  organizationId: string;
  since?: string | null;
  windowDays?: number;
}): Promise<SyncPullSnapshot> {
  const windowDays = input.windowDays && input.windowDays > 0 ? input.windowDays : 3650;
  const since = sinceDate(input.since ?? null, windowDays);

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      name: true,
      settings: true,
      subscriptionStatus: true,
    },
  });
  if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");

  const defaultBranchId = await resolveBranchId(input.organizationId);

  const billCounter = await prisma.shopBillCounter.findUnique({
    where: {
      organizationId_branchId_fiscalYear: {
        organizationId: input.organizationId,
        branchId: defaultBranchId,
        fiscalYear: fiscalYearLabel(),
      },
    },
    select: { seq: true },
  });

  const [
    sales,
    returns,
    inventory,
    customers,
    credits,
    creditEntries,
    purchases,
    expenses,
    staff,
    storage,
  ] = await Promise.all([
    prisma.shopSale.findMany({
      where: { organizationId: input.organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.shopSaleReturn.findMany({
      where: { organizationId: input.organizationId, createdAt: { gte: since } },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.inventoryItem.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 20000,
    }),
    prisma.shopCustomer.findMany({
      where: { organizationId: input.organizationId },
      take: 10000,
    }),
    prisma.customerCredit.findMany({
      where: { organizationId: input.organizationId },
    }),
    prisma.customerCreditEntry.findMany({
      where: { organizationId: input.organizationId, createdAt: { gte: since } },
      take: 5000,
    }),
    prisma.shopPurchase.findMany({
      where: { organizationId: input.organizationId, createdAt: { gte: since } },
      take: 2000,
    }),
    prisma.shopExpense.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        createdAt: { gte: since },
      },
      take: 2000,
    }),
    prisma.staffMember.findMany({
      where: { organizationId: input.organizationId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        cashierCode: true,
        roleTitle: true,
        roleKey: true,
      },
    }),
    getStorageUsageBreakdown(input.organizationId),
  ]);

  return serializeBigInt({
    cursor: new Date().toISOString(),
    windowDays,
    sales,
    returns,
    inventory,
    customers,
    credits,
    creditEntries,
    purchases,
    expenses,
    staff,
    invoiceSettings: parseShopInvoiceSettings(org.settings ?? {}),
    billSeq: billCounter?.seq ?? 0,
    storeCode: resolveStoreCode(
      parseShopInvoiceSettings(org.settings ?? {}) as Record<string, unknown>,
      org.name
    ),
    storage: {
      usedBytes: storage.usedBytes,
      quotaBytes: storage.quotaBytes,
      cloudEnabled: subscriptionAllowsCloudSync(org.subscriptionStatus),
      byCategory: storage.byCategory,
    },
  });
}

export async function getShopSyncStatus(organizationId: string) {
  await ensureSyncSchema();
  const [pending, lastMutation, storage, org] = await Promise.all([
    prisma.syncOutbox.count({
      where: { organizationId, status: { in: ["PENDING", "PROCESSING"] } },
    }),
    prisma.syncMutation.findFirst({
      where: { organizationId },
      orderBy: { appliedAt: "desc" },
      select: { appliedAt: true },
    }),
    getStorageUsageBreakdown(organizationId),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionStatus: true },
    }),
  ]);

  return {
    pendingServerOutbox: pending,
    lastAppliedAt: lastMutation?.appliedAt ?? null,
    cloudEnabled: org
      ? subscriptionAllowsCloudSync(org.subscriptionStatus)
      : false,
    storage,
  };
}
