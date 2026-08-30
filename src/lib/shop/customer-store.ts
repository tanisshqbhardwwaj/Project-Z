import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { normalizeShopPhone } from "@/lib/shop/customer";
import { ensureShopCustomerSchema } from "@/lib/shop/ensure-shop-customer-schema";

export type ShopCustomerRow = {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  email: string | null;
  notes: string | null;
  lastSaleAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShopCustomerWithCount = ShopCustomerRow & {
  _count: { sales: number };
};

function mapRow(row: Record<string, unknown>): ShopCustomerRow {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    name: String(row.name),
    phone: row.phone != null ? String(row.phone) : null,
    gstin: row.gstin != null ? String(row.gstin) : null,
    email: row.email != null ? String(row.email) : null,
    notes: row.notes != null ? String(row.notes) : null,
    lastSaleAt: row.lastSaleAt ? new Date(String(row.lastSaleAt)) : null,
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
  };
}

export type CustomerBranchScope = {
  branchId?: string | null;
  isolated?: boolean;
};

function branchSqlFilter(scope?: CustomerBranchScope): { sql: string; params: unknown[] } {
  if (scope?.isolated && scope.branchId) {
    return { sql: ` AND c."branchId" = ?`, params: [scope.branchId] };
  }
  if (scope?.isolated === false || !scope?.isolated) {
    return { sql: ` AND c."branchId" IS NULL`, params: [] };
  }
  return { sql: "", params: [] };
}

function branchWhere(scope?: CustomerBranchScope): { sql: string; params: unknown[] } {
  if (scope?.isolated && scope.branchId) {
    return { sql: ` AND "branchId" = ?`, params: [scope.branchId] };
  }
  if (scope?.isolated === false || !scope?.isolated) {
    return { sql: ` AND "branchId" IS NULL`, params: [] };
  }
  return { sql: "", params: [] };
}

export async function searchCustomersRaw(
  organizationId: string,
  query: string | undefined,
  limit: number,
  scope?: CustomerBranchScope
): Promise<ShopCustomerWithCount[]> {
  await ensureShopCustomerSchema();
  const q = query?.trim() ?? "";
  const phoneDigits = q.replace(/\D/g, "");
  const branchFilter = branchSqlFilter(scope);

  let rows: Record<string, unknown>[];
  if (q) {
    rows = phoneDigits.length >= 4
      ? await prisma.$queryRawUnsafe(
          `SELECT c.*,
            (SELECT COUNT(*) FROM "ShopSale" s WHERE s."customerId" = c.id) AS saleCount
           FROM "ShopCustomer" c
           WHERE c."organizationId" = ?
             AND (c.name LIKE ? COLLATE NOCASE OR c.phone LIKE ?)${branchFilter.sql}
           ORDER BY c."lastSaleAt" IS NULL, c."lastSaleAt" DESC, c."updatedAt" DESC
           LIMIT ?`,
          organizationId,
          `%${q}%`,
          `%${phoneDigits}%`,
          ...branchFilter.params,
          limit
        )
      : await prisma.$queryRawUnsafe(
          `SELECT c.*,
            (SELECT COUNT(*) FROM "ShopSale" s WHERE s."customerId" = c.id) AS saleCount
           FROM "ShopCustomer" c
           WHERE c."organizationId" = ? AND c.name LIKE ? COLLATE NOCASE${branchFilter.sql}
           ORDER BY c."lastSaleAt" IS NULL, c."lastSaleAt" DESC, c."updatedAt" DESC
           LIMIT ?`,
          organizationId,
          `%${q}%`,
          ...branchFilter.params,
          limit
        );
  } else {
    rows = await prisma.$queryRawUnsafe(
      `SELECT c.*,
        (SELECT COUNT(*) FROM "ShopSale" s WHERE s."customerId" = c.id) AS saleCount
       FROM "ShopCustomer" c
       WHERE c."organizationId" = ?${branchFilter.sql}
       ORDER BY c."lastSaleAt" IS NULL, c."lastSaleAt" DESC, c."updatedAt" DESC
       LIMIT ?`,
      organizationId,
      ...branchFilter.params,
      limit
    );
  }

  return rows.map((row) => ({
    ...mapRow(row),
    _count: { sales: Number(row.saleCount ?? 0) },
  }));
}

export async function listCustomersRaw(
  organizationId: string,
  limit: number,
  scope?: CustomerBranchScope
): Promise<ShopCustomerWithCount[]> {
  return searchCustomersRaw(organizationId, undefined, limit, scope);
}

export async function getCustomerRaw(
  organizationId: string,
  customerId: string
): Promise<ShopCustomerWithCount | null> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT c.*,
      (SELECT COUNT(*) FROM "ShopSale" s WHERE s."customerId" = c.id) AS saleCount
     FROM "ShopCustomer" c
     WHERE c."organizationId" = ? AND c.id = ?`,
    organizationId,
    customerId
  )) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) return null;
  return {
    ...mapRow(row),
    _count: { sales: Number(row.saleCount ?? 0) },
  };
}

export async function upsertCustomerRaw(
  organizationId: string,
  input: {
    customerId?: string | null;
    name?: string | null;
    phone?: string | null;
    gstin?: string | null;
  },
  scope?: CustomerBranchScope
): Promise<ShopCustomerRow | null> {
  await ensureShopCustomerSchema();
  const name = input.name?.trim();
  if (!name) return null;

  const phone = normalizeShopPhone(input.phone);
  const gstin = input.gstin?.trim() || null;
  const now = new Date().toISOString();
  const branchId = scope?.isolated ? scope.branchId ?? null : null;
  const branchFilter = branchWhere(scope);

  if (input.customerId) {
    const existing = await getCustomerRaw(organizationId, input.customerId);
    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ShopCustomer"
         SET name = ?, phone = COALESCE(?, phone), gstin = COALESCE(?, gstin),
             "lastSaleAt" = ?, "updatedAt" = ?
         WHERE id = ? AND "organizationId" = ?`,
        name,
        phone,
        gstin,
        now,
        now,
        existing.id,
        organizationId
      );
      return (await getCustomerRaw(organizationId, existing.id))!;
    }
  }

  if (phone) {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "ShopCustomer" WHERE "organizationId" = ? AND phone = ?${branchFilter.sql}`,
      organizationId,
      phone,
      ...branchFilter.params
    )) as Record<string, unknown>[];
    if (rows[0]) {
      const id = String(rows[0].id);
      await prisma.$executeRawUnsafe(
        `UPDATE "ShopCustomer" SET name = ?, gstin = COALESCE(?, gstin),
         "lastSaleAt" = ?, "updatedAt" = ? WHERE id = ?`,
        name,
        gstin,
        now,
        now,
        id
      );
      return mapRow((await getCustomerRaw(organizationId, id))!);
    }
  } else {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "ShopCustomer"
       WHERE "organizationId" = ? AND phone IS NULL AND lower(name) = lower(?)`,
      organizationId,
      name
    )) as Record<string, unknown>[];
    if (rows[0]) {
      const id = String(rows[0].id);
      await prisma.$executeRawUnsafe(
        `UPDATE "ShopCustomer" SET gstin = COALESCE(?, gstin),
         "lastSaleAt" = ?, "updatedAt" = ? WHERE id = ?`,
        gstin,
        now,
        now,
        id
      );
      return mapRow((await getCustomerRaw(organizationId, id))!);
    }
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ShopCustomer"
     (id, "organizationId", "branchId", name, phone, gstin, "lastSaleAt", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    organizationId,
    branchId,
    name,
    phone,
    gstin,
    now,
    now,
    now
  );
  return mapRow((await getCustomerRaw(organizationId, id))!);
}
