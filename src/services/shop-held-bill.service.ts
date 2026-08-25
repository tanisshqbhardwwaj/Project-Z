import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/ensure-shop-features-schema";
import { createAuditLog } from "./audit.service";

const HOLD_TTL_MS = 30 * 60 * 1000;

export async function expireStaleHeldBills(organizationId: string) {
  await ensureShopFeaturesSchema();
  const now = new Date();
  const stale = await prisma.shopHeldBill.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
  });
  for (const bill of stale) {
    await prisma.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "EXPIRED" },
    });
    await createAuditLog({
      organizationId,
      userId: bill.createdById,
      action: "shop.hold_bill.expired",
      entityType: "ShopHeldBill",
      entityId: bill.id,
      after: { holdNumber: bill.holdNumber },
    });
  }
  return stale.length;
}

async function nextHoldNumber(organizationId: string): Promise<number> {
  const last = await prisma.shopHeldBill.findFirst({
    where: { organizationId },
    orderBy: { holdNumber: "desc" },
    select: { holdNumber: true },
  });
  return (last?.holdNumber ?? 0) + 1;
}

export async function listActiveHeldBills(organizationId: string) {
  await requireModule(organizationId, "shop_sales");
  await expireStaleHeldBills(organizationId);
  return prisma.shopHeldBill.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createHeldBill(input: {
  organizationId: string;
  userId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  salesBoyName?: string | null;
  cartJson: unknown;
  pricingJson?: unknown;
}) {
  await requireModule(input.organizationId, "shop_sales");
  const holdNumber = await nextHoldNumber(input.organizationId);
  const now = new Date();
  const bill = await prisma.shopHeldBill.create({
    data: {
      organizationId: input.organizationId,
      holdNumber,
      customerId: input.customerId ?? null,
      customerName: input.customerName?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      customerGstin: input.customerGstin?.trim() || null,
      salesBoyName: input.salesBoyName?.trim() || null,
      cartJson: input.cartJson as object,
      pricingJson: (input.pricingJson ?? {}) as object,
      status: "ACTIVE",
      expiresAt: new Date(now.getTime() + HOLD_TTL_MS),
      createdById: input.userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.hold_bill.created",
    entityType: "ShopHeldBill",
    entityId: bill.id,
    after: bill,
  });

  return bill;
}

export async function resumeHeldBill(input: {
  organizationId: string;
  userId: string;
  heldBillId: string;
}) {
  await requireModule(input.organizationId, "shop_sales");
  await expireStaleHeldBills(input.organizationId);

  const bill = await prisma.shopHeldBill.findFirst({
    where: { id: input.heldBillId, organizationId: input.organizationId },
  });
  if (!bill) throw new Error("Held bill not found");
  if (bill.status !== "ACTIVE") throw new Error("Held bill is no longer active");
  if (bill.expiresAt <= new Date()) {
    await prisma.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Held bill has expired");
  }

  const updated = await prisma.shopHeldBill.update({
    where: { id: bill.id },
    data: { status: "RESUMED", resumedAt: new Date() },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.hold_bill.resumed",
    entityType: "ShopHeldBill",
    entityId: bill.id,
    before: bill,
    after: updated,
  });

  return bill;
}

export async function cancelHeldBill(input: {
  organizationId: string;
  userId: string;
  heldBillId: string;
}) {
  await requireModule(input.organizationId, "shop_sales");
  const bill = await prisma.shopHeldBill.findFirst({
    where: { id: input.heldBillId, organizationId: input.organizationId },
  });
  if (!bill) throw new Error("Held bill not found");
  if (bill.status !== "ACTIVE") throw new Error("Held bill is not active");

  const updated = await prisma.shopHeldBill.update({
    where: { id: bill.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.hold_bill.cancelled",
    entityType: "ShopHeldBill",
    entityId: bill.id,
    before: bill,
    after: updated,
  });

  return updated;
}

export async function countActiveHeldBills(organizationId: string) {
  await expireStaleHeldBills(organizationId);
  return prisma.shopHeldBill.count({
    where: { organizationId, status: "ACTIVE" },
  });
}
