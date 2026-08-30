import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import {
  customerSearchWhere,
  normalizeShopPhone,
} from "@/lib/shop/customer";
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

function mapRow(row: {
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
}): ShopCustomerRow {
  return { ...row };
}

export async function searchCustomersRaw(
  organizationId: string,
  query: string | undefined,
  limit: number
): Promise<ShopCustomerWithCount[]> {
  await ensureShopCustomerSchema();
  const q = query?.trim() ?? "";

  const rows = await prisma.shopCustomer.findMany({
    where: q ? customerSearchWhere(organizationId, q) : { organizationId },
    take: limit,
    orderBy: [
      { lastSaleAt: { sort: "desc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    include: { _count: { select: { sales: true } } },
  });

  return rows.map((row) => ({
    ...mapRow(row),
    _count: { sales: row._count.sales },
  }));
}

export async function listCustomersRaw(
  organizationId: string,
  limit: number
): Promise<ShopCustomerWithCount[]> {
  return searchCustomersRaw(organizationId, undefined, limit);
}

export async function getCustomerRaw(
  organizationId: string,
  customerId: string
): Promise<ShopCustomerWithCount | null> {
  const row = await prisma.shopCustomer.findFirst({
    where: { id: customerId, organizationId },
    include: { _count: { select: { sales: true } } },
  });
  if (!row) return null;
  return {
    ...mapRow(row),
    _count: { sales: row._count.sales },
  };
}

export async function upsertCustomerRaw(
  organizationId: string,
  input: {
    customerId?: string | null;
    name?: string | null;
    phone?: string | null;
    gstin?: string | null;
  }
): Promise<ShopCustomerRow | null> {
  await ensureShopCustomerSchema();
  const name = input.name?.trim();
  if (!name) return null;

  const phone = normalizeShopPhone(input.phone);
  const gstin = input.gstin?.trim() || null;
  const now = new Date();

  if (input.customerId) {
    const existing = await getCustomerRaw(organizationId, input.customerId);
    if (existing) {
      const updated = await prisma.shopCustomer.update({
        where: { id: existing.id },
        data: {
          name,
          phone: phone ?? existing.phone,
          gstin: gstin ?? existing.gstin,
          lastSaleAt: now,
        },
      });
      return mapRow(updated);
    }
  }

  if (phone) {
    const existing = await prisma.shopCustomer.findFirst({
      where: { organizationId, phone },
    });
    if (existing) {
      const updated = await prisma.shopCustomer.update({
        where: { id: existing.id },
        data: {
          name,
          gstin: gstin ?? existing.gstin,
          lastSaleAt: now,
        },
      });
      return mapRow(updated);
    }
  } else {
    const existing = await prisma.shopCustomer.findFirst({
      where: {
        organizationId,
        phone: null,
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (existing) {
      const updated = await prisma.shopCustomer.update({
        where: { id: existing.id },
        data: {
          gstin: gstin ?? existing.gstin,
          lastSaleAt: now,
        },
      });
      return mapRow(updated);
    }
  }

  const created = await prisma.shopCustomer.create({
    data: {
      id: randomUUID(),
      organizationId,
      name,
      phone,
      gstin,
      lastSaleAt: now,
    },
  });
  return mapRow(created);
}
