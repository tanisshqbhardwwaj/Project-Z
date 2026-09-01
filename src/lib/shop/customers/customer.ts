import type { Prisma } from "@prisma/client";

/** Normalize to last 10 digits for Indian mobiles; null if too short. */
export function normalizeShopPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function formatCustomerLabel(input: {
  name: string;
  phone?: string | null;
}): string {
  const phone = input.phone?.trim();
  if (phone) return `${input.name} · ${phone}`;
  return input.name;
}

export function customerSearchWhere(
  organizationId: string,
  query: string
): Prisma.ShopCustomerWhereInput {
  const q = query.trim();
  if (!q) return { organizationId };

  const phoneDigits = q.replace(/\D/g, "");
  const or: Prisma.ShopCustomerWhereInput[] = [
    { name: { contains: q } },
  ];
  if (phoneDigits.length >= 4) {
    or.push({ phone: { contains: phoneDigits } });
  }
  return { organizationId, OR: or };
}

export function invoiceSearchWhere(
  organizationId: string,
  query: string,
  customerId?: string
): Prisma.ShopSaleWhereInput {
  const where: Prisma.ShopSaleWhereInput = { organizationId };
  if (customerId) where.customerId = customerId;

  const q = query.trim();
  if (!q) return where;

  const phoneDigits = q.replace(/\D/g, "");
  const or: Prisma.ShopSaleWhereInput[] = [
    { customerName: { contains: q } },
    { billNumber: { contains: q } },
  ];
  if (phoneDigits.length >= 4) {
    or.push({ customerPhone: { contains: phoneDigits } });
  }
  where.OR = or;
  return where;
}
