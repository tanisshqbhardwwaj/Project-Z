import type {
  PaymentMethod,
  Prisma,
  ReturnReason,
  ReturnTransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { parseSaleItems, saleLineKey } from "@/lib/shop/sale-line-key";
import { requireModule, getOrgModuleContext } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/ensure-shop-features-schema";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";
import { isInfiniteStock } from "@/lib/shop/inventory";
import { variantDisplayName, variantSubtitle } from "@/lib/shop/variant-display";
import { createAuditLog } from "./audit.service";
import { scheduleShopInventoryAlertSync } from "./shop-notification.service";

async function nextReturnNumber(
  organizationId: string,
  type: ReturnTransactionType
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === "EXCHANGE" ? `EX-${year}-` : `RET-${year}-`;
  const last = await prisma.shopSaleReturn.findFirst({
    where: { organizationId, returnNumber: { startsWith: prefix } },
    orderBy: { returnNumber: "desc" },
    select: { returnNumber: true },
  });
  const seq = last?.returnNumber
    ? parseInt(last.returnNumber.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export type ReturnableLine = {
  lineKey: string;
  inventoryItemId: string | null;
  productId: string | null;
  productName: string;
  /** Full "T-Shirt — Black — Size M" label so the wrong size can't be returned. */
  displayName: string;
  variantSubtitle: string;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPriceRupees: number;
  lineTotalRupees: number;
};

/**
 * Lines still returnable on an invoice. Quantities already returned on earlier
 * receipts are subtracted, so a second partial return can never exceed what was
 * actually sold — no matter how many returns or exchanges came before.
 */
export async function getReturnableLines(
  organizationId: string,
  shopSaleId: string
): Promise<ReturnableLine[]> {
  await requireModule(organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  await ensureCatalogSchema();

  const sale = await prisma.shopSale.findFirst({
    where: { id: shopSaleId, organizationId, status: "COMPLETED" },
  });
  if (!sale) throw new Error("Invoice not found");

  const items = parseSaleItems(sale.itemsJson);

  const [existingReturns, inventoryRows] = await Promise.all([
    prisma.shopSaleReturnLine.findMany({
      where: {
        returnRecord: { organizationId, shopSaleId },
        isExchangeOut: true,
      },
    }),
    // Older invoices predate variant snapshots on the line; fill the gaps from
    // the inventory row so the return screen still shows the size.
    (async () => {
      const ids = [
        ...new Set(
          items.map((i) => i.inventoryItemId).filter((id): id is string => !!id)
        ),
      ];
      if (ids.length === 0) return new Map<string, VariantSnapshot>();
      const rows = await prisma.inventoryItem.findMany({
        where: { id: { in: ids }, organizationId },
        select: {
          id: true,
          productId: true,
          size: true,
          color: true,
          variantLabel: true,
          sku: true,
          barcode: true,
          unit: true,
          name: true,
        },
      });
      return new Map<string, VariantSnapshot>(rows.map((r) => [r.id, r]));
    })(),
  ]);

  const returnedByKey = new Map<string, number>();
  for (const line of existingReturns) {
    returnedByKey.set(
      line.lineKey,
      (returnedByKey.get(line.lineKey) ?? 0) + line.returnQty
    );
  }

  return items.map((item) => {
    const key = saleLineKey(item);
    const returnedQty = returnedByKey.get(key) ?? 0;
    const remainingQty = Math.max(0, item.qty - returnedQty);
    const fallback = item.inventoryItemId
      ? inventoryRows.get(item.inventoryItemId)
      : undefined;

    const descriptor = {
      productName: item.name,
      size: item.size ?? fallback?.size ?? null,
      color: item.color ?? fallback?.color ?? null,
      variantLabel: item.variantLabel ?? fallback?.variantLabel ?? null,
      sku: item.sku ?? fallback?.sku ?? null,
      barcode: item.barcode ?? fallback?.barcode ?? null,
      unit: item.unit ?? fallback?.unit ?? null,
    };

    return {
      lineKey: key,
      inventoryItemId: item.inventoryItemId ?? null,
      productId: item.productId ?? fallback?.productId ?? null,
      productName: item.name,
      displayName: variantDisplayName(descriptor),
      variantSubtitle: variantSubtitle(descriptor),
      size: descriptor.size,
      color: descriptor.color,
      variantLabel: descriptor.variantLabel,
      sku: descriptor.sku,
      barcode: descriptor.barcode,
      unit: descriptor.unit,
      originalQty: item.qty,
      returnedQty,
      remainingQty,
      unitPriceRupees: item.priceRupees,
      lineTotalRupees: item.qty * item.priceRupees,
    };
  });
}

type VariantSnapshot = {
  id: string;
  productId: string | null;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  name: string;
};

const returnInclude = {
  shopSale: {
    select: {
      id: true,
      billNumber: true,
      customerName: true,
      customerPhone: true,
      totalPaise: true,
      createdAt: true,
      salesBoyName: true,
    },
  },
  lines: true,
  createdBy: { select: { id: true, name: true } },
  staff: { select: { id: true, name: true, roleTitle: true } },
} satisfies Prisma.ShopSaleReturnInclude;

export async function listSaleReturns(
  organizationId: string,
  shopSaleId?: string,
  options?: { type?: ReturnTransactionType; from?: Date; to?: Date; limit?: number }
) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  await ensureCatalogSchema();
  return prisma.shopSaleReturn.findMany({
    where: {
      organizationId,
      ...(shopSaleId ? { shopSaleId } : {}),
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.from || options?.to
        ? {
            createdAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
    include: returnInclude,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 200,
  });
}

/** Full receipt payload: original bill → returned items → replacements → money. */
export async function getSaleReturn(organizationId: string, returnId: string) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  await ensureCatalogSchema();

  const record = await prisma.shopSaleReturn.findFirst({
    where: { id: returnId, organizationId },
    include: {
      ...returnInclude,
      organization: { select: { name: true, settings: true } },
    },
  });
  if (!record) throw new Error("Return receipt not found");

  const exchangeSale = record.exchangeSaleId
    ? await prisma.shopSale.findFirst({
        where: { id: record.exchangeSaleId, organizationId },
        select: { id: true, billNumber: true, totalPaise: true, createdAt: true },
      })
    : null;

  return { ...record, exchangeSale };
}

export type ProcessReturnLineInput = { lineKey: string; returnQty: number };

export type ProcessReturnExchangeItem = {
  inventoryItemId?: string;
  name: string;
  qty: number;
  priceRupees: number;
};

type PreparedReturnLine = {
  lineKey: string;
  inventoryItemId: string | null;
  productId: string | null;
  productName: string;
  size: string | null;
  variantLabel: string | null;
  sku: string | null;
  unitLabel: string | null;
  barcode: string | null;
  originalQty: number;
  returnQty: number;
  unitPricePaise: bigint;
  lineRefundPaise: bigint;
};

type PreparedExchangeLine = PreparedReturnLine & { inventoryItemId: string | null };

/**
 * Records a return or a partial exchange as its OWN receipt. The original
 * invoice is never modified — it stays as historical sales data — and the
 * receipt carries every number the counter needs to explain the transaction.
 *
 * Inventory, the receipt and the customer ledger all move inside one
 * transaction, so stock can never drift from the financial record.
 */
export async function processReturn(input: {
  organizationId: string;
  userId: string;
  shopSaleId: string;
  type?: ReturnTransactionType;
  reason: ReturnReason;
  notes?: string | null;
  /** How the money difference is settled (refund out or extra collected). */
  refundMethod: PaymentMethod;
  lines: ProcessReturnLineInput[];
  exchangeItems?: ProcessReturnExchangeItem[];
  /** Staff who processed the counter transaction. */
  staffId?: string | null;
  staffName?: string | null;
}) {
  await requireModule(input.organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  await ensureCatalogSchema();

  const sale = await prisma.shopSale.findFirst({
    where: {
      id: input.shopSaleId,
      organizationId: input.organizationId,
      status: "COMPLETED",
    },
  });
  if (!sale) throw new Error("Invoice not found");

  if (input.lines.length === 0) {
    throw new Error("Select at least one item to return");
  }

  const returnable = await getReturnableLines(input.organizationId, input.shopSaleId);
  const returnableMap = new Map(returnable.map((l) => [l.lineKey, l]));

  // ── Returned goods ────────────────────────────────────────────────────────
  let returnValuePaise = BigInt(0);
  const returnedLines: PreparedReturnLine[] = [];
  const seenKeys = new Set<string>();

  for (const req of input.lines) {
    if (req.returnQty <= 0) continue;
    if (seenKeys.has(req.lineKey)) {
      throw new Error("The same line was submitted twice");
    }
    seenKeys.add(req.lineKey);

    const meta = returnableMap.get(req.lineKey);
    if (!meta) throw new Error("This item is not on the original invoice");
    if (req.returnQty > meta.remainingQty + 1e-9) {
      throw new Error(
        meta.remainingQty <= 0
          ? `"${meta.displayName}" has already been fully returned`
          : `Cannot return ${req.returnQty} of "${meta.displayName}" — only ${meta.remainingQty} left on this bill`
      );
    }

    const unitPaise = rupeesToPaise(meta.unitPriceRupees);
    const lineRefund = BigInt(Math.round(req.returnQty * Number(unitPaise)));
    returnValuePaise += lineRefund;
    returnedLines.push({
      lineKey: req.lineKey,
      inventoryItemId: meta.inventoryItemId,
      productId: meta.productId,
      productName: meta.productName,
      size: meta.size,
      variantLabel: meta.variantLabel,
      sku: meta.sku,
      unitLabel: meta.unit,
      barcode: meta.barcode,
      originalQty: meta.originalQty,
      returnQty: req.returnQty,
      unitPricePaise: unitPaise,
      lineRefundPaise: lineRefund,
    });
  }

  if (returnedLines.length === 0) throw new Error("No valid return quantities");

  // ── Replacement goods ─────────────────────────────────────────────────────
  const exchangeRequests = (input.exchangeItems ?? []).filter((i) => i.qty > 0);
  const isExchange =
    input.type === "EXCHANGE" ? exchangeRequests.length > 0 : exchangeRequests.length > 0;

  if (input.type === "EXCHANGE" && exchangeRequests.length === 0) {
    throw new Error("Pick at least one replacement product for an exchange");
  }

  let exchangeValuePaise = BigInt(0);
  const exchangeLines: PreparedExchangeLine[] = [];

  if (exchangeRequests.length > 0) {
    const ids = [
      ...new Set(
        exchangeRequests
          .map((i) => i.inventoryItemId)
          .filter((id): id is string => !!id)
      ),
    ];
    const variants = ids.length
      ? await prisma.inventoryItem.findMany({
          where: { id: { in: ids }, organizationId: input.organizationId },
          include: { product: { select: { id: true, name: true } } },
        })
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    for (const item of exchangeRequests) {
      const variant = item.inventoryItemId
        ? variantById.get(item.inventoryItemId)
        : undefined;
      if (item.inventoryItemId && !variant) {
        throw new Error("Replacement product was not found in stock");
      }

      const descriptor = {
        productName: variant?.product?.name ?? variant?.name ?? item.name,
        size: variant?.size ?? null,
        color: variant?.color ?? null,
        variantLabel: variant?.variantLabel ?? null,
        sku: variant?.sku ?? null,
        barcode: variant?.barcode ?? null,
      };

      const priceRupees =
        item.priceRupees > 0
          ? item.priceRupees
          : variant?.sellPaise
            ? Number(variant.sellPaise) / 100
            : 0;
      if (priceRupees <= 0) {
        throw new Error(
          `Set a price for the replacement "${variantDisplayName(descriptor)}"`
        );
      }

      const unitPaise = rupeesToPaise(priceRupees);
      const lineTotal = BigInt(Math.round(item.qty * Number(unitPaise)));
      exchangeValuePaise += lineTotal;

      exchangeLines.push({
        lineKey: `exchange-in:${variant?.id ?? item.name}`,
        inventoryItemId: variant?.id ?? null,
        productId: variant?.productId ?? null,
        productName: descriptor.productName,
        size: descriptor.size,
        variantLabel: descriptor.variantLabel,
        sku: descriptor.sku,
        unitLabel: variant?.unit ?? null,
        barcode: descriptor.barcode,
        originalQty: item.qty,
        returnQty: item.qty,
        unitPricePaise: unitPaise,
        lineRefundPaise: lineTotal,
      });
    }
  }

  // ── Money ─────────────────────────────────────────────────────────────────
  // Cheaper replacement → refund the difference. Dearer → collect the difference.
  const refundAmountPaise =
    returnValuePaise > exchangeValuePaise ? returnValuePaise - exchangeValuePaise : BigInt(0);
  const additionalPaidPaise =
    exchangeValuePaise > returnValuePaise ? exchangeValuePaise - returnValuePaise : BigInt(0);

  const type: ReturnTransactionType = isExchange ? "EXCHANGE" : "RETURN";
  const returnNumber = await nextReturnNumber(input.organizationId, type);

  const staff = await resolveReturnStaff(input.organizationId, {
    staffId: input.staffId,
    staffName: input.staffName ?? sale.salesBoyName,
  });

  const { enabledModules } = await getOrgModuleContext(input.organizationId);
  const udhaarEnabled = enabledModules.shop_udhaar === true;
  if (input.refundMethod === "CREDIT" && refundAmountPaise > BigInt(0) && !udhaarEnabled) {
    throw new Error(
      "Store credit needs the Udhaar ledger. Turn it on in Manage Organization → Features, or refund in cash."
    );
  }

  const returnRecord = await prisma.$transaction(async (tx) => {
    // Returned goods come back into stock, on the exact variant that was sold.
    for (const line of returnedLines) {
      if (!line.inventoryItemId) continue;
      const inv = await tx.inventoryItem.findFirst({
        where: { id: line.inventoryItemId, organizationId: input.organizationId },
      });
      if (!inv) continue;
      if (isInfiniteStock(inv.quantity)) continue;
      await tx.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity + line.returnQty },
      });
    }

    // Replacement goods leave stock. Checked inside the transaction so two
    // simultaneous exchanges can't both take the last piece.
    for (const line of exchangeLines) {
      if (!line.inventoryItemId) continue;
      const inv = await tx.inventoryItem.findFirst({
        where: { id: line.inventoryItemId, organizationId: input.organizationId },
      });
      if (!inv) throw new Error("Replacement product was not found in stock");
      if (isInfiniteStock(inv.quantity)) continue;
      if (inv.quantity < line.returnQty) {
        throw new Error(
          `Not enough stock for "${variantDisplayName({ productName: line.productName, size: line.size, variantLabel: line.variantLabel })}" (have ${inv.quantity}, need ${line.returnQty})`
        );
      }
      await tx.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity - line.returnQty },
      });
    }

    const created = await tx.shopSaleReturn.create({
      data: {
        organizationId: input.organizationId,
        shopSaleId: input.shopSaleId,
        returnNumber,
        type,
        returnValuePaise,
        exchangeValuePaise,
        additionalPaidPaise,
        refundAmountPaise,
        refundMethod: input.refundMethod,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        customerId: sale.customerId,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        staffId: staff.staffId,
        staffName: staff.staffName,
        createdById: input.userId,
        lines: {
          create: [
            ...returnedLines.map((l) => ({
              lineKey: l.lineKey,
              inventoryItemId: l.inventoryItemId,
              productId: l.productId,
              productName: l.productName,
              size: l.size,
              variantLabel: l.variantLabel,
              sku: l.sku,
              unitLabel: l.unitLabel,
              barcode: l.barcode,
              originalQty: l.originalQty,
              returnQty: l.returnQty,
              unitPricePaise: l.unitPricePaise,
              lineRefundPaise: l.lineRefundPaise,
              isExchangeOut: true,
              isExchangeIn: false,
            })),
            ...exchangeLines.map((l) => ({
              lineKey: l.lineKey,
              inventoryItemId: l.inventoryItemId,
              productId: l.productId,
              productName: l.productName,
              size: l.size,
              variantLabel: l.variantLabel,
              sku: l.sku,
              unitLabel: l.unitLabel,
              barcode: l.barcode,
              originalQty: l.originalQty,
              returnQty: l.returnQty,
              unitPricePaise: l.unitPricePaise,
              lineRefundPaise: l.lineRefundPaise,
              isExchangeOut: false,
              isExchangeIn: true,
            })),
          ],
        },
      },
      include: returnInclude,
    });

    await settleCustomerBalance(tx, {
      organizationId: input.organizationId,
      userId: input.userId,
      sale,
      returnNumber,
      refundAmountPaise,
      additionalPaidPaise,
      refundMethod: input.refundMethod,
      udhaarEnabled,
    });

    return created;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: type === "EXCHANGE" ? "shop.exchange.created" : "shop.return.created",
    entityType: "ShopSaleReturn",
    entityId: returnRecord.id,
    after: {
      returnNumber,
      originalBill: sale.billNumber,
      returnValuePaise: returnValuePaise.toString(),
      exchangeValuePaise: exchangeValuePaise.toString(),
      refundAmountPaise: refundAmountPaise.toString(),
      additionalPaidPaise: additionalPaidPaise.toString(),
    },
  });

  scheduleShopInventoryAlertSync(input.organizationId);

  return returnRecord;
}

async function resolveReturnStaff(
  organizationId: string,
  input: { staffId?: string | null; staffName?: string | null }
): Promise<{ staffId: string | null; staffName: string | null }> {
  const typedName = input.staffName?.trim() || null;
  if (input.staffId) {
    const staff = await prisma.staffMember
      .findFirst({
        where: { id: input.staffId, organizationId },
        select: { id: true, name: true },
      })
      .catch(() => null);
    if (staff) return { staffId: staff.id, staffName: staff.name };
  }
  if (typedName) {
    const match = await prisma.staffMember
      .findFirst({
        where: { organizationId, name: typedName },
        select: { id: true, name: true },
      })
      .catch(() => null);
    if (match) return { staffId: match.id, staffName: match.name };
  }
  return { staffId: null, staffName: typedName };
}

/**
 * Applies the money difference to the customer's udhaar account.
 *
 * - Refund on a credit sale first cancels what the customer still owes; only the
 *   surplus becomes a store-credit balance.
 * - Extra money collected on a dearer exchange is recorded as an adjustment so
 *   the ledger keeps tying out.
 *
 * Cash/UPI refunds on fully paid bills need no ledger entry — the money simply
 * leaves the till, which the return receipt already records.
 */
async function settleCustomerBalance(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    userId: string;
    sale: { id: string; customerId: string | null; customerPhone: string | null; customerName: string | null };
    returnNumber: string;
    refundAmountPaise: bigint;
    additionalPaidPaise: bigint;
    refundMethod: PaymentMethod;
    udhaarEnabled: boolean;
  }
) {
  if (!input.udhaarEnabled) return;
  if (input.refundAmountPaise <= BigInt(0) && input.additionalPaidPaise <= BigInt(0)) {
    return;
  }

  const credit = await tx.customerCredit.findFirst({
    where: {
      organizationId: input.organizationId,
      ...(input.sale.customerId
        ? { shopCustomerId: input.sale.customerId }
        : input.sale.customerPhone
          ? { phone: input.sale.customerPhone }
          : { id: "__none__" }),
    },
  });
  if (!credit) return;

  if (input.refundAmountPaise > BigInt(0)) {
    const newBalance =
      credit.balancePaise > input.refundAmountPaise
        ? credit.balancePaise - input.refundAmountPaise
        : BigInt(0);
    const newPurchases =
      credit.totalPurchasesPaise > input.refundAmountPaise
        ? credit.totalPurchasesPaise - input.refundAmountPaise
        : BigInt(0);

    await tx.customerCredit.update({
      where: { id: credit.id },
      data: { balancePaise: newBalance, totalPurchasesPaise: newPurchases },
    });
    await tx.customerCreditEntry.create({
      data: {
        organizationId: input.organizationId,
        creditId: credit.id,
        shopSaleId: input.sale.id,
        type: "RETURN_REFUND",
        amountPaise: -input.refundAmountPaise,
        balanceAfterPaise: newBalance,
        paymentMethod: input.refundMethod,
        notes: `Return ${input.returnNumber}`,
        createdById: input.userId,
      },
    });
    return;
  }

  const newBalance = credit.balancePaise + input.additionalPaidPaise;
  await tx.customerCredit.update({
    where: { id: credit.id },
    data: {
      balancePaise: input.refundMethod === "CREDIT" ? newBalance : credit.balancePaise,
      totalPurchasesPaise: credit.totalPurchasesPaise + input.additionalPaidPaise,
    },
  });
  await tx.customerCreditEntry.create({
    data: {
      organizationId: input.organizationId,
      creditId: credit.id,
      shopSaleId: input.sale.id,
      type: "ADJUSTMENT",
      amountPaise: input.additionalPaidPaise,
      balanceAfterPaise:
        input.refundMethod === "CREDIT" ? newBalance : credit.balancePaise,
      paymentMethod: input.refundMethod,
      notes: `Exchange ${input.returnNumber} — customer paid difference`,
      createdById: input.userId,
    },
  });
}

export async function countRecentReturns(organizationId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return prisma.shopSaleReturn.count({
    where: { organizationId, createdAt: { gte: since } },
  });
}

/**
 * Net value returned per invoice, used to strip returned sales out of staff
 * commission and profit reporting.
 */
export async function getReturnAdjustmentsBySale(
  organizationId: string,
  saleIds: string[]
): Promise<Map<string, { returnValuePaise: bigint; exchangeValuePaise: bigint }>> {
  const result = new Map<
    string,
    { returnValuePaise: bigint; exchangeValuePaise: bigint }
  >();
  if (saleIds.length === 0) return result;

  const rows = await prisma.shopSaleReturn.findMany({
    where: { organizationId, shopSaleId: { in: saleIds } },
    select: {
      shopSaleId: true,
      returnValuePaise: true,
      exchangeValuePaise: true,
    },
  });

  for (const row of rows) {
    const current = result.get(row.shopSaleId) ?? {
      returnValuePaise: BigInt(0),
      exchangeValuePaise: BigInt(0),
    };
    current.returnValuePaise += row.returnValuePaise;
    current.exchangeValuePaise += row.exchangeValuePaise;
    result.set(row.shopSaleId, current);
  }

  return result;
}
