import type { PaymentMethod, ReturnReason, ReturnTransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { parseSaleItems, saleLineKey } from "@/lib/shop/sale-line-key";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/ensure-shop-features-schema";
import { createAuditLog } from "./audit.service";
import { createShopSale, type ShopSaleItem } from "./shop.service";

async function nextReturnNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RET-${year}-`;
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

export async function getReturnableLines(organizationId: string, shopSaleId: string) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  const sale = await prisma.shopSale.findFirst({
    where: { id: shopSaleId, organizationId, status: "COMPLETED" },
  });
  if (!sale) throw new Error("Invoice not found");

  const items = parseSaleItems(sale.itemsJson);
  const existingReturns = await prisma.shopSaleReturnLine.findMany({
    where: {
      returnRecord: { organizationId, shopSaleId },
      isExchangeOut: true,
    },
  });

  const returnedByKey = new Map<string, number>();
  for (const line of existingReturns) {
    returnedByKey.set(line.lineKey, (returnedByKey.get(line.lineKey) ?? 0) + line.returnQty);
  }

  return items.map((item) => {
    const key = saleLineKey(item);
    const returnedQty = returnedByKey.get(key) ?? 0;
    const remainingQty = Math.max(0, item.qty - returnedQty);
    return {
      lineKey: key,
      productName: item.name,
      barcode: item.barcode ?? null,
      inventoryItemId: item.inventoryItemId ?? null,
      originalQty: item.qty,
      returnedQty,
      remainingQty,
      unitPriceRupees: item.priceRupees,
      lineTotalRupees: item.qty * item.priceRupees,
    };
  });
}

export async function listSaleReturns(organizationId: string, shopSaleId?: string) {
  await requireModule(organizationId, "shop_sales");
  return prisma.shopSaleReturn.findMany({
    where: {
      organizationId,
      ...(shopSaleId ? { shopSaleId } : {}),
    },
    include: {
      shopSale: {
        select: {
          id: true,
          billNumber: true,
          customerName: true,
          customerPhone: true,
        },
      },
      lines: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function processReturn(input: {
  organizationId: string;
  userId: string;
  shopSaleId: string;
  type?: ReturnTransactionType;
  reason: ReturnReason;
  notes?: string | null;
  refundMethod: PaymentMethod;
  lines: { lineKey: string; returnQty: number }[];
  exchangeItems?: ShopSaleItem[];
  exchangePaymentMethod?: PaymentMethod;
  exchangePaidRupees?: number;
}) {
  await requireModule(input.organizationId, "shop_sales");

  const sale = await prisma.shopSale.findFirst({
    where: { id: input.shopSaleId, organizationId: input.organizationId, status: "COMPLETED" },
  });
  if (!sale) throw new Error("Invoice not found");

  const returnable = await getReturnableLines(input.organizationId, input.shopSaleId);
  const returnableMap = new Map(returnable.map((l) => [l.lineKey, l]));

  if (input.lines.length === 0) throw new Error("Select at least one item to return");

  let returnValuePaise = BigInt(0);
  const lineRecords: {
    lineKey: string;
    inventoryItemId: string | null;
    productName: string;
    barcode: string | null;
    originalQty: number;
    returnQty: number;
    unitPricePaise: bigint;
    lineRefundPaise: bigint;
  }[] = [];

  for (const req of input.lines) {
    if (req.returnQty <= 0) continue;
    const meta = returnableMap.get(req.lineKey);
    if (!meta) throw new Error(`Invalid line: ${req.lineKey}`);
    if (req.returnQty > meta.remainingQty + 1e-9) {
      throw new Error(
        `Cannot return ${req.returnQty} of "${meta.productName}" — only ${meta.remainingQty} remaining`
      );
    }
    const unitPaise = rupeesToPaise(meta.unitPriceRupees);
    const lineRefund = BigInt(Math.round(req.returnQty * Number(unitPaise)));
    returnValuePaise += lineRefund;
    lineRecords.push({
      lineKey: req.lineKey,
      inventoryItemId: meta.inventoryItemId,
      productName: meta.productName,
      barcode: meta.barcode,
      originalQty: meta.originalQty,
      returnQty: req.returnQty,
      unitPricePaise: unitPaise,
      lineRefundPaise: lineRefund,
    });
  }

  if (lineRecords.length === 0) throw new Error("No valid return quantities");

  const isExchange = Boolean(input.exchangeItems && input.exchangeItems.length > 0);
  let exchangeSaleId: string | null = null;
  let exchangeTotalPaise = BigInt(0);

  if (isExchange && input.exchangeItems) {
    const exchangeSale = await createShopSale({
      organizationId: input.organizationId,
      createdById: input.userId,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerGstin: sale.customerGstin,
      salesBoyName: sale.salesBoyName,
      issueInvoice: true,
      items: input.exchangeItems,
      paymentMethod: input.exchangePaymentMethod ?? "CASH",
      paidRupees: input.exchangePaidRupees,
      notes: `Exchange from invoice ${sale.billNumber ?? sale.id}`,
    });
    exchangeSaleId = exchangeSale.id;
    exchangeTotalPaise = exchangeSale.totalPaise;
  }

  const netRefundPaise =
    returnValuePaise > exchangeTotalPaise
      ? returnValuePaise - exchangeTotalPaise
      : BigInt(0);

  const returnNumber = await nextReturnNumber(input.organizationId);

  const returnRecord = await prisma.$transaction(async (tx) => {
    for (const line of lineRecords) {
      if (line.inventoryItemId) {
        const inv = await tx.inventoryItem.findFirst({
          where: { id: line.inventoryItemId, organizationId: input.organizationId },
        });
        if (inv) {
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantity: inv.quantity + line.returnQty },
          });
        }
      }
    }

    const created = await tx.shopSaleReturn.create({
      data: {
        organizationId: input.organizationId,
        shopSaleId: input.shopSaleId,
        returnNumber,
        type: isExchange ? "EXCHANGE" : "RETURN",
        refundAmountPaise: netRefundPaise,
        refundMethod: input.refundMethod,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        exchangeSaleId,
        createdById: input.userId,
        lines: {
          create: lineRecords.map((l) => ({
            lineKey: l.lineKey,
            inventoryItemId: l.inventoryItemId,
            productName: l.productName,
            barcode: l.barcode,
            originalQty: l.originalQty,
            returnQty: l.returnQty,
            unitPricePaise: l.unitPricePaise,
            lineRefundPaise: l.lineRefundPaise,
            isExchangeOut: true,
            isExchangeIn: false,
          })),
        },
      },
      include: {
        lines: true,
        shopSale: { select: { billNumber: true, customerName: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (netRefundPaise > BigInt(0) && sale.customerPhone) {
      const credit = await tx.customerCredit.findFirst({
        where: { organizationId: input.organizationId, phone: sale.customerPhone },
      });
      if (credit) {
        const newBalance =
          credit.balancePaise > netRefundPaise
            ? credit.balancePaise - netRefundPaise
            : BigInt(0);
        const newPurchases =
          credit.totalPurchasesPaise > netRefundPaise
            ? credit.totalPurchasesPaise - netRefundPaise
            : BigInt(0);
        await tx.customerCredit.update({
          where: { id: credit.id },
          data: { balancePaise: newBalance, totalPurchasesPaise: newPurchases },
        });
        if (input.refundMethod === "CREDIT") {
          await tx.customerCreditEntry.create({
            data: {
              organizationId: input.organizationId,
              creditId: credit.id,
              shopSaleId: sale.id,
              type: "RETURN_REFUND",
              amountPaise: netRefundPaise,
              balanceAfterPaise: newBalance,
              paymentMethod: input.refundMethod,
              notes: `Return ${returnNumber}`,
              createdById: input.userId,
            },
          });
        }
      }
    }

    return created;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: isExchange ? "shop.exchange.created" : "shop.return.created",
    entityType: "ShopSaleReturn",
    entityId: returnRecord.id,
    after: returnRecord,
  });

  return returnRecord;
}

export async function countRecentReturns(organizationId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return prisma.shopSaleReturn.count({
    where: { organizationId, createdAt: { gte: since } },
  });
}
