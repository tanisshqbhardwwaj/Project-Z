import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod, Prisma } from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { isInfiniteStock } from "@/lib/shop/inventory";
import { mergeInventorySectorMeta } from "@/lib/shop/inventory-categories";
import { generateShopBarcode, normalizeBarcode } from "@/lib/shop/barcode";
import {
  billNumberToBarcodeValue,
  normalizeBillScan,
} from "@/lib/shop/bill-barcode";
import { nextShopBillNumber } from "@/lib/shop/bill-number";
import {
  customerSearchWhere,
  invoiceSearchWhere,
} from "@/lib/shop/customer";
import {
  getCustomerRaw,
  listCustomersRaw,
  searchCustomersRaw,
  upsertCustomerRaw,
} from "@/lib/shop/customer-store";
import { ensureShopExtendedSchema } from "@/lib/shop/ensure-shop-extended-schema";
import { ensureShopSaleSchema } from "@/lib/shop/ensure-shop-sale-schema";
import { getOrgModuleContext } from "@/lib/org/require-module";
import {
  computeSaleCostPaise,
  deriveInvoicePaymentStatus,
  recordCreditFromSale,
} from "./shop-credit.service";
import { getPurchaseSummary } from "./shop-purchase.service";
import { getExpenseSummary } from "./shop-expense.service";
import { getTotalOutstandingCredit } from "./shop-credit.service";
import {
  computeInvoicePricing,
  resolveInvoiceLineAllocations,
  type StoredInvoicePricing,
} from "@/lib/shop/invoice-pricing";
import { parseOrgSettings } from "@/lib/org/require-module";
import { parseShopInvoiceSettings } from "@/lib/org/shop-settings";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "./audit.service";
import { scheduleShopInventoryAlertSync } from "./shop-notification.service";
import {
  computeInventoryAnalytics,
  computeInventorySnapshot,
  parseSaleItemsJson,
  type SaleLineInput,
} from "@/lib/shop/inventory-analytics";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";
import {
  hasVariantAttributes,
  variantDisplayName,
  variantSubtitle,
} from "@/lib/shop/variant-display";

export type ShopSaleItem = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  productId?: string;
  barcode?: string;
  sku?: string;
  size?: string;
  color?: string;
  variantLabel?: string;
  unit?: string;
  costPaisePerUnit?: number;
};

/**
 * Copies the variant attributes of each cart line off the inventory row so the
 * stored invoice keeps saying "Size M" forever, and returns/exchanges can never
 * put stock back on the wrong size.
 */
async function enrichSaleItemsWithVariants(
  organizationId: string,
  items: ShopSaleItem[]
): Promise<ShopSaleItem[]> {
  const ids = [
    ...new Set(items.map((i) => i.inventoryItemId).filter((id): id is string => !!id)),
  ];
  if (ids.length === 0) return items;

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
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  return items.map((item) => {
    if (!item.inventoryItemId) return item;
    const row = byId.get(item.inventoryItemId);
    if (!row) return item;
    return {
      ...item,
      productId: item.productId ?? row.productId ?? undefined,
      size: item.size ?? row.size ?? undefined,
      color: item.color ?? row.color ?? undefined,
      variantLabel: item.variantLabel ?? row.variantLabel ?? undefined,
      sku: item.sku ?? row.sku ?? undefined,
      barcode: item.barcode ?? row.barcode ?? undefined,
      unit: item.unit ?? row.unit ?? undefined,
    };
  });
}

export async function getShopSale(organizationId: string, saleId: string) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();
  const sale = await prisma.shopSale.findFirst({
    where: { id: saleId, organizationId },
    include: {
      organization: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!sale) throw new Error("Sale not found");
  return sale;
}

/**
 * A barcode always resolves to exactly one variant, so scanning BAR002 selects
 * "Premium T-Shirt — Black — Size M" and deducts stock from that size only.
 */
export async function lookupInventoryByBarcode(
  organizationId: string,
  barcode: string
) {
  await requireModule(organizationId, "shop_inventory");
  const code = normalizeBarcode(barcode);
  if (!code) throw new Error("Barcode is required");

  const item = await prisma.inventoryItem.findFirst({
    where: { organizationId, barcode: code },
    include: {
      product: {
        select: { id: true, name: true, brand: true, hasVariants: true, variantAxis: true },
      },
    },
  });
  if (!item) throw new Error(`No product found for barcode ${code}`);
  return withVariantDisplay(item);
}

type InventoryRowWithProduct = {
  name: string;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  attributes?: unknown;
  product?: { name: string; brand: string | null } | null;
};

/** Attaches the canonical variant display strings used across every screen. */
function withVariantDisplay<T extends InventoryRowWithProduct>(item: T) {
  const descriptor = {
    productName: item.product?.name ?? item.name,
    name: item.name,
    size: item.size,
    color: item.color,
    variantLabel: item.variantLabel,
    brand: item.product?.brand ?? null,
    sku: item.sku,
    barcode: item.barcode,
    unit: item.unit,
    attributes: item.attributes,
  };
  return {
    ...item,
    displayName: variantDisplayName(descriptor),
    variantSubtitle: variantSubtitle(descriptor),
    hasVariantAttributes: hasVariantAttributes(descriptor),
  };
}

const saleScanSelect = {
  id: true,
  billNumber: true,
  customerName: true,
  totalPaise: true,
  createdAt: true,
  paymentMethod: true,
} as const;

export async function lookupSaleByBillScan(
  organizationId: string,
  scanned: string
) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();

  const trimmed = scanned.trim();
  if (!trimmed) throw new Error("Barcode is required");

  if (/[A-Za-z]/.test(trimmed)) {
    const exact = await prisma.shopSale.findFirst({
      where: { organizationId, billNumber: trimmed },
      select: saleScanSelect,
    });
    if (exact) return exact;
  }

  const target = normalizeBillScan(trimmed);
  if (!target.replace(/0/g, "")) {
    throw new Error("Invalid bill barcode");
  }

  const sales = await prisma.shopSale.findMany({
    where: { organizationId, billNumber: { not: null } },
    select: saleScanSelect,
    orderBy: { createdAt: "desc" },
    take: 3000,
  });

  const match = sales.find(
    (s) => s.billNumber && billNumberToBarcodeValue(s.billNumber) === target
  );
  if (!match) throw new Error("No invoice found for this bill barcode");
  return match;
}

export async function findShopSaleByBillNumber(
  organizationId: string,
  billNumber: string
) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();

  const trimmed = billNumber.trim();
  if (!trimmed) throw new Error("Bill number is required");

  const sale = await prisma.shopSale.findFirst({
    where: { organizationId, billNumber: trimmed },
    select: {
      id: true,
      billNumber: true,
      customerName: true,
      staffId: true,
      status: true,
    },
  });
  if (!sale) throw new Error("No invoice found for this bill number");
  if (sale.status !== "COMPLETED") {
    throw new Error("This invoice cannot be returned");
  }
  return sale;
}

export type BarcodeScanResult =
  | { type: "product"; item: Awaited<ReturnType<typeof lookupInventoryByBarcode>> }
  | { type: "invoice"; sale: Awaited<ReturnType<typeof lookupSaleByBillScan>> };

/** Product barcode → inventory item; bill receipt barcode → invoice. */
export async function resolveBarcodeScan(
  organizationId: string,
  code: string
): Promise<BarcodeScanResult> {
  try {
    const item = await lookupInventoryByBarcode(organizationId, code);
    return { type: "product", item };
  } catch {
    /* try invoice */
  }

  const sale = await lookupSaleByBillScan(organizationId, code);
  return { type: "invoice", sale };
}

export async function listShopSales(
  organizationId: string,
  opts?: { q?: string; customerId?: string; limit?: number; staffId?: string }
) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();
  const where = invoiceSearchWhere(
    organizationId,
    opts?.q ?? "",
    opts?.customerId
  );
  if (opts?.staffId) {
    where.staffId = opts.staffId;
  }
  return prisma.shopSale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}

export async function searchShopCustomers(
  organizationId: string,
  query?: string,
  limit = 20
) {
  await requireModule(organizationId, "shop_sales");
  return searchCustomersRaw(organizationId, query, limit);
}

export async function listShopCustomers(organizationId: string, limit = 200) {
  await requireModule(organizationId, "shop_sales");
  return listCustomersRaw(organizationId, limit);
}

export async function getShopCustomer(organizationId: string, customerId: string) {
  await requireModule(organizationId, "shop_sales");
  const customer = await getCustomerRaw(organizationId, customerId);
  if (!customer) throw new Error("Customer not found");
  const sales = await prisma.shopSale.findMany({
    where: { organizationId, customerId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      billNumber: true,
      totalPaise: true,
      paymentMethod: true,
      createdAt: true,
    },
  });
  return { ...customer, sales };
}

export async function getShopDashboard(
  organizationId: string,
  period: "today" | "month" = "today"
) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();
  await ensureShopExtendedSchema();

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);
  if (period === "today") {
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  const invoiceSettings = parseShopInvoiceSettings(org?.settings ?? {});
  const defaultStaffTarget =
    invoiceSettings.defaultStaffMonthlyTargetRupees ?? 0;
  const staffTargets = invoiceSettings.staffMonthlyTargets ?? {};

  const [periodSales, recentInvoices, inventorySnapshot, profitToday, purchaseSummary, expenseSummary, outstandingCreditPaise, totalCustomers, totalStaff, heldBillsCount, activeOffersCount, recentReturnsCount, topCustomer] =
    await Promise.all([
    prisma.shopSale.findMany({
      where: { organizationId, createdAt: { gte: periodStart } },
      select: { totalPaise: true, totalCostPaise: true, paymentMethod: true, salesBoyName: true },
    }),
    prisma.shopSale.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        billNumber: true,
        customerName: true,
        customerPhone: true,
        totalPaise: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
    prisma.inventoryItem
      .findMany({
        where: { organizationId },
        select: {
          quantity: true,
          reorderLevel: true,
          sellPaise: true,
          barcode: true,
        },
      })
      .then(computeInventorySnapshot)
      .catch(() => null),
    (async () => {
      try {
        const { getShopProfitAnalytics } = await import("./shop-profit.service");
        return getShopProfitAnalytics({
          organizationId,
          period: period === "today" ? "today" : "month",
        });
      } catch {
        return null;
      }
    })(),
    getPurchaseSummary(organizationId, periodStart, periodEnd).catch(() => ({
      purchaseCount: 0,
      totalPaise: "0",
    })),
    getExpenseSummary(organizationId, periodStart, periodEnd).catch(() => ({
      expenseCount: 0,
      totalPaise: "0",
      byCategory: [],
      monthlyFixedPaise: "0",
    })),
    getTotalOutstandingCredit(organizationId).catch(() => "0"),
    prisma.shopCustomer.count({ where: { organizationId } }).catch(() => 0),
    prisma.staffMember.count({ where: { organizationId, status: "ACTIVE" } }).catch(() => 0),
    (async () => {
      try {
        const { countActiveHeldBills } = await import("./shop-held-bill.service");
        return countActiveHeldBills(organizationId);
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { countActiveOffers } = await import("./shop-offer.service");
        return countActiveOffers(organizationId);
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { countRecentReturns } = await import("./shop-return.service");
        return countRecentReturns(organizationId, 7);
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { getTopCustomerSummary } = await import("./shop-customer-analytics.service");
        return getTopCustomerSummary(organizationId);
      } catch {
        return null;
      }
    })(),
  ]);

  let salesPaise = BigInt(0);
  const paymentSplit: Record<string, number> = {};
  const staffMap = new Map<string, { salesPaise: bigint; invoiceCount: number }>();

  for (const sale of periodSales) {
    salesPaise += sale.totalPaise;
    paymentSplit[sale.paymentMethod] = (paymentSplit[sale.paymentMethod] ?? 0) + 1;
    const staffName = sale.salesBoyName?.trim() || "Unassigned";
    const cur = staffMap.get(staffName) ?? {
      salesPaise: BigInt(0),
      invoiceCount: 0,
    };
    cur.salesPaise += sale.totalPaise;
    cur.invoiceCount += 1;
    staffMap.set(staffName, cur);
  }

  const salesByStaff = [...staffMap.entries()]
    .map(([name, stats]) => {
      const targetRupees =
        period === "month" ? (staffTargets[name] ?? defaultStaffTarget) : 0;
      const salesRupees = Number(stats.salesPaise) / 100;
      const progressPercent =
        targetRupees > 0
          ? Math.min(100, Math.round((salesRupees / targetRupees) * 100))
          : null;
      return {
        name,
        salesPaise: stats.salesPaise.toString(),
        invoiceCount: stats.invoiceCount,
        targetRupees,
        progressPercent,
      };
    })
    .sort((a, b) => Number(b.salesPaise) - Number(a.salesPaise));

  return {
    period,
    salesPaise: salesPaise.toString(),
    invoiceCount: periodSales.length,
    todaySalesPaise: salesPaise.toString(),
    todayInvoiceCount: periodSales.length,
    lowStockCount: inventorySnapshot?.lowStockCount ?? 0,
    stockValueRupees: inventorySnapshot?.stockValueRupees ?? 0,
    paymentToday: paymentSplit,
    paymentSplit,
    salesByStaff,
    recentInvoices,
    profitPaise: profitToday?.grossProfitPaise ?? "0",
    netProfitPaise: profitToday?.netProfitPaise ?? "0",
    purchaseTotalPaise: purchaseSummary.totalPaise,
    purchaseCount: purchaseSummary.purchaseCount,
    expenseTotalPaise: expenseSummary.totalPaise,
    expenseCount: expenseSummary.expenseCount,
    outstandingCreditPaise,
    totalProducts: inventorySnapshot?.skuCount ?? 0,
    totalCustomers,
    totalStaff,
    heldBillsCount,
    activeOffersCount,
    recentReturnsCount,
    topCustomer: topCustomer
      ? {
          name: topCustomer.name,
          totalPaise: topCustomer.totalPaise,
          orderCount: topCustomer.orderCount,
        }
      : null,
    topExpenseCategories: expenseSummary.byCategory.slice(0, 5),
    monthlyFixedExpensesPaise: expenseSummary.monthlyFixedPaise,
  };
}

export async function getStaffSalesInvoices(
  organizationId: string,
  period: "today" | "month",
  staffName: string
) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();

  const periodStart = new Date();
  if (period === "today") {
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
  }

  const sales = await prisma.shopSale.findMany({
    where: {
      organizationId,
      createdAt: { gte: periodStart },
      ...(staffName === "Unassigned"
        ? { OR: [{ salesBoyName: null }, { salesBoyName: "" }] }
        : { salesBoyName: staffName }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      billNumber: true,
      customerName: true,
      customerPhone: true,
      totalPaise: true,
      paymentMethod: true,
      createdAt: true,
    },
  });

  let salesPaise = BigInt(0);
  for (const sale of sales) {
    salesPaise += sale.totalPaise;
  }

  return {
    staffName,
    period,
    salesPaise: salesPaise.toString(),
    invoiceCount: sales.length,
    invoices: sales,
  };
}

/**
 * Ties a sale to a staff record so commission can be computed from real
 * invoices. Falls back to name matching for tills that still type a name, and
 * degrades to a plain name when the staff module is off.
 */
async function resolveSaleStaff(
  organizationId: string,
  input: {
    staffId?: string | null;
    salesBoyName?: string | null;
    createdById?: string;
  }
): Promise<{
  staffId: string | null;
  staffName: string | null;
  cashierCode: string | null;
}> {
  const typedName = input.salesBoyName?.trim() || null;
  const staffSelect = {
    id: true,
    name: true,
    cashierCode: true,
  } as const;

  if (input.staffId) {
    const staff = await prisma.staffMember
      .findFirst({
        where: { id: input.staffId, organizationId },
        select: staffSelect,
      })
      .catch(() => null);
    if (staff) {
      return {
        staffId: staff.id,
        staffName: staff.name,
        cashierCode: staff.cashierCode,
      };
    }
  }

  if (input.createdById) {
    const linked = await prisma.staffMember
      .findFirst({
        where: {
          organizationId,
          userId: input.createdById,
          status: "ACTIVE",
        },
        select: staffSelect,
      })
      .catch(() => null);
    if (linked) {
      return {
        staffId: linked.id,
        staffName: linked.name,
        cashierCode: linked.cashierCode,
      };
    }
  }

  if (typedName) {
    const match = await prisma.staffMember
      .findFirst({
        where: { organizationId, status: "ACTIVE", name: typedName },
        select: staffSelect,
      })
      .catch(() => null);
    if (match) {
      return {
        staffId: match.id,
        staffName: match.name,
        cashierCode: match.cashierCode,
      };
    }
  }

  return { staffId: null, staffName: typedName, cashierCode: null };
}

export async function createShopSale(input: {
  /** Client-generated UUID so offline push is idempotent. */
  clientId?: string | null;
  organizationId: string;
  createdById: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  staffId?: string | null;
  salesBoyName?: string | null;
  billNumber?: string | null;
  issueInvoice?: boolean;
  totalRupees?: number;
  gstRupees?: number;
  discountRupees?: number;
  discountPercent?: number;
  roundOffRupees?: number;
  taxRatePercent?: number;
  taxIncluded?: boolean;
  manualGstRupees?: number | null;
  paymentMethod?: PaymentMethod;
  paidRupees?: number;
  items: ShopSaleItem[];
  notes?: string | null;
  selectedOfferId?: string | null;
  skipOffer?: boolean;
  appliedOffers?: { offerId: string; name: string; discountRupees: number }[];
}) {
  await requireModule(input.organizationId, "shop_sales");
  await ensureShopSaleSchema();
  await ensureShopExtendedSchema();
  await ensureCatalogSchema();

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { settings: true },
  });
  const invoiceSettings = parseShopInvoiceSettings(org?.settings ?? {});

  const { staffId, staffName, cashierCode } = await resolveSaleStaff(
    input.organizationId,
    {
      staffId: input.staffId,
      salesBoyName: input.salesBoyName,
      createdById: input.createdById,
    }
  );

  let appliedOffers: { offerId: string; name: string; discountRupees: number }[] = [];
  let offerDiscountRupees = 0;
  let offerLineDiscountRupees: number[] | undefined;
  try {
    const { computeOfferDiscountForSale } = await import("./shop-offer.service");
    const offerResult = await computeOfferDiscountForSale(
      input.organizationId,
      input.items,
      { selectedOfferId: input.selectedOfferId ?? null, skipOffer: input.skipOffer }
    );
    offerDiscountRupees = offerResult.offerDiscountRupees;
    offerLineDiscountRupees = offerResult.lineDiscountRupees;
    appliedOffers = offerResult.offerDetails;
  } catch {
    /* offers optional if schema not ready */
  }

  const subtotalRupees = input.items.reduce((s, l) => s + l.qty * l.priceRupees, 0);
  const manualDiscountMode: "percent" | "rupees" =
    (input.discountPercent ?? 0) > 0 ? "percent" : "rupees";
  const manualDiscountPercent =
    manualDiscountMode === "percent" ? (input.discountPercent ?? 0) : 0;
  let manualDiscountRupees = 0;
  if (manualDiscountMode === "percent") {
    manualDiscountRupees = Math.round((subtotalRupees * manualDiscountPercent) / 100 * 100) / 100;
  } else {
    manualDiscountRupees = input.discountRupees ?? 0;
  }
  const totalDiscountRupees = manualDiscountRupees + offerDiscountRupees;
  const useDecimalPlaces = invoiceSettings.useDecimalPlaces !== false;

  const pricing = computeInvoicePricing({
    items: input.items,
    discountRupees: totalDiscountRupees,
    discountPercent: 0,
    discountBasis: invoiceSettings.discountBasis ?? "subtotal",
    taxRatePercent: input.taxRatePercent,
    taxIncluded: input.taxIncluded,
    manualGstRupees: input.manualGstRupees ?? input.gstRupees,
    useDecimalPlaces,
  });

  const totalPaise =
    input.totalRupees != null
      ? rupeesToPaise(input.totalRupees)
      : pricing.totalPaise;
  if (totalPaise <= BigInt(0)) throw new Error("Sale total must be greater than zero");

  const showLineHints = offerDiscountRupees > 0 || manualDiscountMode === "percent";
  const savedLineDiscounts = showLineHints
    ? resolveInvoiceLineAllocations(input.items, {
        showLineHints: true,
        totalDiscountRupees: totalDiscountRupees,
        manualDiscountRupees,
        manualDiscountMode,
        offerLineDiscountRupees,
      })?.map((line) => line.lineDiscountRupees)
    : undefined;

  const pricingJson: StoredInvoicePricing & {
    offerDiscountRupees?: number;
    selectedOfferId?: string | null;
    appliedOffers?: { offerId: string; name: string; discountRupees: number }[];
  } = {
    subtotalRupees: pricing.subtotalRupees,
    discountRupees: pricing.discountRupees,
    discountPercent: manualDiscountMode === "percent" ? manualDiscountPercent : 0,
    discountBasis: pricing.discountBasis,
    taxableRupees: pricing.taxableRupees,
    gstRupees: pricing.gstRupees,
    cgstRupees: pricing.cgstRupees,
    sgstRupees: pricing.sgstRupees,
    taxIncluded: pricing.taxIncluded,
    taxRatePercent: pricing.taxRatePercent,
    roundOffRupees: pricing.roundOffRupees,
    manualGstRupees: input.manualGstRupees ?? null,
    ...(manualDiscountRupees > 0
      ? {
          manualDiscountRupees,
          manualDiscountMode,
          ...(manualDiscountMode === "percent"
            ? { manualDiscountPercent }
            : {}),
        }
      : {}),
    ...(appliedOffers.length
      ? {
          offerDiscountRupees,
          selectedOfferId: appliedOffers[0]!.offerId,
          appliedOffers,
        }
      : {
          ...(input.selectedOfferId !== undefined
            ? { selectedOfferId: input.selectedOfferId }
            : {}),
        }),
    ...(savedLineDiscounts?.length ? { lineDiscountRupees: savedLineDiscounts } : {}),
  };

  const customer = await upsertCustomerRaw(input.organizationId, {
    customerId: input.customerId,
    name: input.customerName,
    phone: input.customerPhone,
    gstin: input.customerGstin,
  });

  const customerName = input.customerName?.trim() || customer?.name || null;
  const customerPhone = input.customerPhone?.trim() || customer?.phone || null;
  const customerGstin = input.customerGstin?.trim() || customer?.gstin || null;

  const deductions = new Map<string, number>();
  for (const item of input.items) {
    if (item.inventoryItemId) {
      deductions.set(
        item.inventoryItemId,
        (deductions.get(item.inventoryItemId) ?? 0) + item.qty
      );
    }
  }

  const enrichedItems = await enrichSaleItemsWithVariants(
    input.organizationId,
    input.items
  );
  const { totalCostPaise, itemsWithCost } = await computeSaleCostPaise(
    input.organizationId,
    enrichedItems
  );

  const paidPaise =
    input.paidRupees != null
      ? rupeesToPaise(input.paidRupees)
      : input.paymentMethod === "CREDIT"
        ? BigInt(0)
        : totalPaise;
  const paymentStatus = deriveInvoicePaymentStatus(totalPaise, paidPaise);

  const sale = await prisma.$transaction(async (tx) => {
    if (deductions.size > 0) {
      const inventoryIds = [...deductions.keys()];
      const inventoryItems = await tx.inventoryItem.findMany({
        where: {
          id: { in: inventoryIds },
          organizationId: input.organizationId,
        },
      });

      if (inventoryItems.length !== inventoryIds.length) {
        throw new Error("One or more inventory items were not found");
      }

      for (const inv of inventoryItems) {
        const deductQty = deductions.get(inv.id)!;
        if (isInfiniteStock(inv.quantity)) continue;
        if (inv.quantity < deductQty) {
          throw new Error(
            `Not enough stock for "${inv.name}" (have ${inv.quantity}, need ${deductQty})`
          );
        }
      }

      for (const inv of inventoryItems) {
        const deductQty = deductions.get(inv.id)!;
        if (isInfiniteStock(inv.quantity)) continue;
        await tx.inventoryItem.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - deductQty },
        });
      }
    }

    const customerRecord = customer;

    return tx.shopSale.create({
      data: {
        ...(input.clientId ? { id: input.clientId } : {}),
        organizationId: input.organizationId,
        createdById: input.createdById,
        customerId: customerRecord?.id ?? null,
        customerName,
        customerPhone,
        customerGstin,
        staffId,
        salesBoyName: staffName,
        billNumber:
          input.billNumber?.trim() ||
          (await nextShopBillNumber(tx, input.organizationId, cashierCode)),
        issueInvoice: input.issueInvoice !== false,
        totalPaise,
        gstPaise: pricing.gstPaise,
        paidAmountPaise: paidPaise,
        totalCostPaise,
        paymentStatus,
        paymentMethod: input.paymentMethod ?? "CASH",
        itemsJson: itemsWithCost,
        notes: input.notes?.trim() || null,
        pricingJson,
      },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
  });

  const creditOwed = totalPaise - paidPaise;
  if (creditOwed > BigInt(0)) {
    const { enabledModules } = await getOrgModuleContext(input.organizationId);
    if (!enabledModules.shop_udhaar) {
      throw new Error(
        "Customer credit ledger is not enabled. Turn on Udhaar in Manage Organization → Features, or collect full payment."
      );
    }
    await recordCreditFromSale({
      organizationId: input.organizationId,
      userId: input.createdById,
      shopSaleId: sale.id,
      customerId: customer?.id ?? null,
      customerName,
      customerPhone,
      totalPaise,
      paidPaise,
      paymentMethod: input.paymentMethod,
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "shop.sale.created",
    entityType: "ShopSale",
    entityId: sale.id,
    after: sale,
  });

  if (appliedOffers.length) {
    try {
      const { recordOfferUsage } = await import("./shop-offer.service");
      await recordOfferUsage(input.organizationId, appliedOffers);
    } catch {
      /* offers table may not exist yet */
    }
  }

  scheduleShopInventoryAlertSync(input.organizationId);

  return sale;
}

/**
 * Every inventory row is a sellable variant. Rows come back with the resolved
 * variant display name so any product selector in the app can show
 * "T-Shirt — Black — Size M" without duplicating the formatting rules.
 */
export async function listInventoryItems(organizationId: string) {
  await requireModule(organizationId, "shop_inventory");
  await ensureCatalogSchema();
  const items = await prisma.inventoryItem.findMany({
    where: { organizationId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          hasVariants: true,
          variantAxis: true,
          categoryKey: true,
          subCategoryKey: true,
        },
      },
    },
    orderBy: [{ name: "asc" }, { size: "asc" }],
  });
  return items.map(withVariantDisplay);
}

export async function getInventoryAnalytics(organizationId: string, salesDays = 30) {
  await requireModule(organizationId, "shop_inventory");

  const days = Math.min(Math.max(Math.round(salesDays), 7), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const items = await prisma.inventoryItem.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      size: true,
      quantity: true,
      reorderLevel: true,
      sellPaise: true,
      barcode: true,
    },
  });

  const salesLines: SaleLineInput[] = [];

  try {
    await requireModule(organizationId, "shop_sales");
    const sales = await prisma.shopSale.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { itemsJson: true },
    });
    for (const sale of sales) {
      salesLines.push(...parseSaleItemsJson(sale.itemsJson));
    }
  } catch {
    // Sales module off — top/bottom sellers stay empty
  }

  return computeInventoryAnalytics({
    items,
    salesLines,
    salesDays: days,
  });
}

export async function createInventoryItem(input: {
  organizationId: string;
  productId?: string | null;
  name: string;
  description?: string | null;
  size?: string | null;
  color?: string | null;
  variantLabel?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  quantity?: number;
  reorderLevel?: number;
  costRupees?: number | null;
  sellRupees?: number | null;
  supplierName?: string | null;
  batchNo?: string | null;
  autoBarcode?: boolean;
  category?: string | null;
  subCategory?: string | null;
  expiryDate?: Date | null;
  attributes?: Record<string, string>;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const name = input.name.trim();
  if (name.length < 1) throw new Error("Item name is required");

  let barcode = input.barcode ? normalizeBarcode(input.barcode) : null;
  if (!barcode && input.autoBarcode !== false) {
    barcode = generateShopBarcode(input.organizationId.slice(-6));
  }
  if (barcode) {
    const clash = await prisma.inventoryItem.findFirst({
      where: { organizationId: input.organizationId, barcode },
    });
    if (clash) throw new Error("This barcode is already used by another product");
  }

  const item = await prisma.inventoryItem.create({
    data: {
      organizationId: input.organizationId,
      productId: input.productId ?? null,
      name,
      description: input.description?.trim() || null,
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      variantLabel: input.variantLabel?.trim() || null,
      sku: input.sku?.trim() || null,
      barcode,
      unit: input.unit?.trim() || "pcs",
      quantity: input.quantity ?? 0,
      reorderLevel: input.reorderLevel ?? 0,
      costPaise:
        input.costRupees != null && input.costRupees > 0
          ? rupeesToPaise(input.costRupees)
          : null,
      sellPaise:
        input.sellRupees != null && input.sellRupees > 0
          ? rupeesToPaise(input.sellRupees)
          : null,
      supplierName: input.supplierName?.trim() || null,
      batchNo: input.batchNo?.trim() || null,
      attributes: (input.attributes ?? {}) as Prisma.InputJsonValue,
      sectorMeta: (
        input.category || input.subCategory
          ? mergeInventorySectorMeta({}, {
              category: input.category,
              subCategory: input.subCategory,
            })
          : {}
      ) as Prisma.InputJsonValue,
      expiryDate: input.expiryDate ?? null,
    },
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return item;
}

export async function updateInventoryItem(input: {
  organizationId: string;
  itemId: string;
  userId: string;
  name?: string;
  description?: string | null;
  size?: string | null;
  color?: string | null;
  variantLabel?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity?: number;
  reorderLevel?: number;
  costRupees?: number | null;
  sellRupees?: number | null;
  supplierName?: string | null;
  batchNo?: string | null;
  generateBarcode?: boolean;
  category?: string | null;
  subCategory?: string | null;
  expiryDate?: Date | null;
  attributes?: Record<string, string>;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const existing = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Inventory item not found");

  const data: {
    name?: string;
    description?: string | null;
    size?: string | null;
    color?: string | null;
    variantLabel?: string | null;
    sku?: string | null;
    barcode?: string | null;
    quantity?: number;
    reorderLevel?: number;
    costPaise?: bigint | null;
    sellPaise?: bigint | null;
    supplierName?: string | null;
    batchNo?: string | null;
    sectorMeta?: Prisma.InputJsonValue;
    attributes?: Prisma.InputJsonValue;
    expiryDate?: Date | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Item name is required");
    data.name = name;
  }
  if (input.size !== undefined) {
    data.size = input.size?.trim() || null;
  }
  if (input.color !== undefined) {
    data.color = input.color?.trim() || null;
  }
  if (input.variantLabel !== undefined) {
    data.variantLabel = input.variantLabel?.trim() || null;
  }
  if (input.sku !== undefined) {
    data.sku = input.sku?.trim() || null;
  }
  if (input.supplierName !== undefined) {
    data.supplierName = input.supplierName?.trim() || null;
  }
  if (input.batchNo !== undefined) {
    data.batchNo = input.batchNo?.trim() || null;
  }
  if (input.attributes !== undefined) {
    data.attributes = input.attributes as Prisma.InputJsonValue;
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.generateBarcode) {
    let barcode = generateShopBarcode(input.organizationId.slice(-6));
    for (let attempt = 0; attempt < 3; attempt++) {
      const clash = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: input.organizationId,
          barcode,
          NOT: { id: input.itemId },
        },
      });
      if (!clash) break;
      barcode = generateShopBarcode(input.organizationId.slice(-6));
    }
    data.barcode = barcode;
  } else if (input.barcode !== undefined) {
    const barcode = input.barcode ? normalizeBarcode(input.barcode) : null;
    if (barcode) {
      const clash = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: input.organizationId,
          barcode,
          NOT: { id: input.itemId },
        },
      });
      if (clash) throw new Error("This barcode is already used by another product");
    }
    data.barcode = barcode;
  }
  if (input.quantity !== undefined) data.quantity = input.quantity;
  if (input.reorderLevel !== undefined) data.reorderLevel = input.reorderLevel;
  if (input.costRupees !== undefined) {
    data.costPaise =
      input.costRupees != null && input.costRupees > 0
        ? rupeesToPaise(input.costRupees)
        : null;
  }
  if (input.sellRupees !== undefined) {
    data.sellPaise =
      input.sellRupees != null && input.sellRupees > 0
        ? rupeesToPaise(input.sellRupees)
        : null;
  }
  if (input.category !== undefined || input.subCategory !== undefined) {
    data.sectorMeta = mergeInventorySectorMeta(existing.sectorMeta, {
      category: input.category,
      subCategory: input.subCategory,
    }) as Prisma.InputJsonValue;
  }
  if (input.expiryDate !== undefined) {
    data.expiryDate = input.expiryDate;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: input.itemId },
    data,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.inventory.updated",
    entityType: "InventoryItem",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return updated;
}

export async function deleteInventoryItem(input: {
  organizationId: string;
  itemId: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "shop_inventory");

  const existing = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Inventory item not found");

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.delete({ where: { id: input.itemId } });

    // Removing the last variant retires the parent product too, so the product
    // list never shows an empty shell.
    if (existing.productId) {
      const remaining = await tx.inventoryItem.count({
        where: { productId: existing.productId },
      });
      if (remaining === 0) {
        await tx.shopProduct.update({
          where: { id: existing.productId },
          data: { deletedAt: new Date() },
        });
      } else if (remaining === 1) {
        await tx.shopProduct.update({
          where: { id: existing.productId },
          data: { hasVariants: false },
        });
      }
    }
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.inventory.deleted",
    entityType: "InventoryItem",
    entityId: input.itemId,
    before: existing,
  });

  scheduleShopInventoryAlertSync(input.organizationId);
}

export type BulkImportItemInput = import("@/lib/shop/inventory-bulk-csv").BulkImportRow;

export async function bulkImportInventoryItems(input: {
  organizationId: string;
  userId: string;
  items: BulkImportItemInput[];
  businessTypes?: string[];
}) {
  await requireModule(input.organizationId, "shop_inventory");
  if (input.items.length === 0) throw new Error("No rows to import");
  if (input.items.length > 500) throw new Error("Maximum 500 rows per import");

  const { groupImportRowsIntoProducts } = await import("@/lib/shop/inventory-bulk-csv");
  const { createShopProduct } = await import("./shop-product.service");

  const groups = groupImportRowsIntoProducts(
    input.items,
    input.businessTypes ?? ["GENERAL"]
  );

  const created: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    try {
      const product = await createShopProduct({
        organizationId: input.organizationId,
        userId: input.userId,
        name: group.name,
        description: group.description,
        brand: group.brand,
        categoryKey: group.category,
        subCategoryKey: group.subCategory,
        unit: group.unit,
        hasVariants: group.hasVariants && group.variants.length > 0,
        variantAxis: group.hasVariants ? group.variantAxis : null,
        supplierName: group.supplier,
        variants: group.variants.map((v) => ({
          size: v.size ?? null,
          color: v.color ?? null,
          variantLabel: v.variantLabel ?? null,
          sku: v.sku ?? null,
          barcode: v.barcode ?? null,
          quantity: v.quantity,
          reorderLevel: v.reorderLevel,
          sellRupees: v.sellRupees,
          costRupees: v.costRupees,
          expiryDate: v.expiryDate ? new Date(v.expiryDate) : null,
          attributes: v.attributes,
        })),
        autoBarcode: true,
        autoSku: true,
      });
      created.push(product.id);
    } catch (err) {
      errors.push(
        `Product ${group.name}: ${err instanceof Error ? err.message : "Failed"}`
      );
    }
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.inventory.bulk_import",
    entityType: "InventoryItem",
    entityId: input.organizationId,
    after: { created: created.length, errors: errors.length },
  });

  scheduleShopInventoryAlertSync(input.organizationId);

  return { created: created.length, errors };
}

export async function bulkGenerateBarcodes(input: {
  organizationId: string;
  userId: string;
  itemIds?: string[];
  onlyMissing?: boolean;
}) {
  await requireModule(input.organizationId, "shop_inventory");

  const where: {
    organizationId: string;
    id?: { in: string[] };
    OR?: Array<{ barcode: null } | { barcode: string }>;
  } = { organizationId: input.organizationId };

  if (input.itemIds?.length) {
    where.id = { in: input.itemIds };
  }
  if (input.onlyMissing !== false) {
    where.OR = [{ barcode: null }];
  }

  const items = await prisma.inventoryItem.findMany({ where });
  let updated = 0;

  for (const item of items) {
    if (item.barcode && input.onlyMissing !== false) continue;
    await updateInventoryItem({
      organizationId: input.organizationId,
      itemId: item.id,
      userId: input.userId,
      generateBarcode: true,
    });
    updated++;
  }

  return { updated, total: items.length };
}

export async function bulkUpdatePrices(input: {
  organizationId: string;
  userId: string;
  itemIds?: string[];
  category?: string | null;
  mode: "set" | "increase_percent" | "decrease_percent" | "add" | "subtract";
  value: number;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  if (input.value < 0) throw new Error("Value must be non-negative");

  let items = await prisma.inventoryItem.findMany({
    where: { organizationId: input.organizationId },
  });

  if (input.itemIds?.length) {
    const idSet = new Set(input.itemIds);
    items = items.filter((i) => idSet.has(i.id));
  }

  if (input.category) {
    items = items.filter((item) => {
      const meta = item.sectorMeta as Record<string, unknown> | null;
      return meta?.category === input.category;
    });
  }

  let updated = 0;
  for (const item of items) {
    const current = item.sellPaise != null ? Number(item.sellPaise) / 100 : null;
    let next: number | null = null;

    switch (input.mode) {
      case "set":
        next = input.value;
        break;
      case "increase_percent":
        if (current == null) continue;
        next = current * (1 + input.value / 100);
        break;
      case "decrease_percent":
        if (current == null) continue;
        next = current * (1 - input.value / 100);
        break;
      case "add":
        if (current == null) continue;
        next = current + input.value;
        break;
      case "subtract":
        if (current == null) continue;
        next = Math.max(0, current - input.value);
        break;
    }

    if (next == null || next <= 0) continue;
    await updateInventoryItem({
      organizationId: input.organizationId,
      itemId: item.id,
      userId: input.userId,
      sellRupees: Math.round(next * 100) / 100,
    });
    updated++;
  }

  return { updated };
}

export async function receiveStock(input: {
  organizationId: string;
  userId: string;
  lines: Array<{ itemId: string; addQty: number; costRupees?: number | null }>;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  if (input.lines.length === 0) throw new Error("Add at least one item");

  let updated = 0;
  for (const line of input.lines) {
    if (line.addQty <= 0) continue;
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: line.itemId, organizationId: input.organizationId },
    });
    if (!existing) throw new Error("Item not found");

    const newQty = isInfiniteStock(existing.quantity)
      ? existing.quantity
      : existing.quantity + line.addQty;

    await updateInventoryItem({
      organizationId: input.organizationId,
      itemId: line.itemId,
      userId: input.userId,
      quantity: newQty,
      costRupees: line.costRupees ?? undefined,
    });
    updated++;
  }

  return { updated };
}

export async function mergeInventoryItems(input: {
  organizationId: string;
  userId: string;
  keepItemId: string;
  mergeItemIds: string[];
  combineStock?: boolean;
}) {
  await requireModule(input.organizationId, "shop_inventory");

  const uniqueMergeIds = [...new Set(input.mergeItemIds.filter((id) => id !== input.keepItemId))];
  if (uniqueMergeIds.length === 0) throw new Error("Select at least one item to merge");

  const keep = await prisma.inventoryItem.findFirst({
    where: { id: input.keepItemId, organizationId: input.organizationId },
  });
  if (!keep) throw new Error("Keep item not found");

  const toMerge = await prisma.inventoryItem.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: uniqueMergeIds },
    },
  });
  if (toMerge.length !== uniqueMergeIds.length) {
    throw new Error("One or more merge items not found");
  }

  let extraQty = 0;
  for (const item of toMerge) {
    if (!isInfiniteStock(item.quantity)) {
      extraQty += item.quantity;
    }
  }

  if (input.combineStock && extraQty > 0 && !isInfiniteStock(keep.quantity)) {
    await prisma.inventoryItem.update({
      where: { id: keep.id },
      data: { quantity: keep.quantity + extraQty },
    });
  }

  for (const item of toMerge) {
    await deleteInventoryItem({
      organizationId: input.organizationId,
      itemId: item.id,
      userId: input.userId,
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.inventory.merge",
    entityType: "InventoryItem",
    entityId: keep.id,
    after: { merged: uniqueMergeIds, combineStock: input.combineStock ?? false },
  });

  return {
    keptId: keep.id,
    mergedCount: uniqueMergeIds.length,
    stockAdded: input.combineStock ? extraQty : 0,
  };
}

export async function listCustomerCredits(organizationId: string) {
  await requireModule(organizationId, "shop_udhaar");
  return prisma.customerCredit.findMany({
    where: { organizationId },
    orderBy: { customerName: "asc" },
  });
}

export async function createCustomerCredit(input: {
  organizationId: string;
  customerName: string;
  phone?: string | null;
  balanceRupees?: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_udhaar");

  const customerName = input.customerName.trim();
  if (customerName.length < 2) throw new Error("Customer name must be at least 2 characters");

  return prisma.customerCredit.create({
    data: {
      organizationId: input.organizationId,
      customerName,
      phone: input.phone?.trim() || null,
      balancePaise: rupeesToPaise(input.balanceRupees ?? 0),
      notes: input.notes?.trim() || null,
    },
  });
}

export async function adjustCustomerCredit(input: {
  organizationId: string;
  creditId: string;
  userId: string;
  deltaRupees: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_udhaar");

  const existing = await prisma.customerCredit.findFirst({
    where: { id: input.creditId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Customer credit not found");

  const deltaPaise = rupeesToPaise(input.deltaRupees);
  const updated = await prisma.customerCredit.update({
    where: { id: input.creditId },
    data: {
      balancePaise: existing.balancePaise + deltaPaise,
      notes: input.notes?.trim() ?? existing.notes,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.udhaar.adjusted",
    entityType: "CustomerCredit",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}
