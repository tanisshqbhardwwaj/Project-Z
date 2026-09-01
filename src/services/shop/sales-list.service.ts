import { prisma } from "@/lib/db/prisma";
import { toCursorPage, type CursorPage } from "@/lib/api/cursor-page";
import { invoiceSearchWhere } from "@/lib/shop/customers/customer";
import {
  getCustomerRaw,
  searchCustomersRaw,
  type CustomerBranchScope,
} from "@/lib/shop/customers/customer-store";
import { ensureShopCustomerSchema } from "@/lib/shop/schema/ensure-shop-customer-schema";
import { ensureShopSaleSchema } from "@/lib/shop/schema/ensure-shop-sale-schema";
import { requireModule } from "@/lib/org/require-module";
import { isBranchAll, type BranchScope } from "@/lib/shop/branch/branch-context";

export type ShopCustomerWithCount = Awaited<
  ReturnType<typeof searchCustomersRaw>
>[number];

export async function listShopSales(
  organizationId: string,
  opts?: {
    q?: string;
    customerId?: string;
    branchId?: BranchScope;
    limit?: number;
    staffId?: string;
    cursor?: string;
  }
): Promise<CursorPage<Awaited<ReturnType<typeof prisma.shopSale.findMany>>[number]>> {
  await requireModule(organizationId, "shop_sales");
  await ensureShopSaleSchema();
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 25));
  const where = invoiceSearchWhere(
    organizationId,
    opts?.q ?? "",
    opts?.customerId
  );
  if (opts?.branchId && !isBranchAll(opts.branchId)) {
    where.branchId = opts.branchId;
  }
  if (opts?.staffId) {
    where.staffId = opts.staffId;
  }
  const rows = await prisma.shopSale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  return toCursorPage(rows, limit);
}

export async function searchShopCustomers(
  organizationId: string,
  query?: string,
  limit = 20,
  cursor?: string,
  scope?: CustomerBranchScope
): Promise<CursorPage<ShopCustomerWithCount>> {
  await requireModule(organizationId, "shop_sales");
  return listShopCustomersPage(organizationId, { q: query, limit, cursor, scope });
}

export async function listShopCustomers(
  organizationId: string,
  limit = 25,
  cursor?: string,
  scope?: CustomerBranchScope
): Promise<CursorPage<ShopCustomerWithCount>> {
  await requireModule(organizationId, "shop_sales");
  return listShopCustomersPage(organizationId, { limit, cursor, scope });
}

async function listShopCustomersPage(
  organizationId: string,
  opts: { q?: string; limit?: number; cursor?: string; scope?: CustomerBranchScope }
): Promise<CursorPage<ShopCustomerWithCount>> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const q = opts.q?.trim() ?? "";

  if (q) {
    const rows = await searchCustomersRaw(organizationId, q, limit + 1, opts.scope);
    const filtered = opts.cursor
      ? rows.slice(rows.findIndex((r) => r.id === opts.cursor) + 1)
      : rows;
    return toCursorPage(filtered, limit);
  }

  await ensureShopCustomerSchema();
  const branchWhere =
    opts.scope?.isolated && opts.scope.branchId
      ? { branchId: opts.scope.branchId }
      : opts.scope?.isolated
        ? {}
        : { branchId: null };
  const rows = await prisma.shopCustomer.findMany({
    where: { organizationId, ...branchWhere },
    orderBy: [{ lastSaleAt: "desc" }, { updatedAt: "desc" }],
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: { _count: { select: { sales: true } } },
  });
  return toCursorPage(rows, limit);
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
