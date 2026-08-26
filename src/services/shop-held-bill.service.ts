import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/ensure-shop-features-schema";
<<<<<<< HEAD
import {
  createReservationsForHeldBill,
  purgeStaleStockReservations,
  releaseReservationsForHeldBill,
} from "@/lib/inventory/stock-reservation";
=======
>>>>>>> origin/master
import { createAuditLog } from "./audit.service";

const HOLD_TTL_MS = 30 * 60 * 1000;

export async function expireStaleHeldBills(organizationId: string) {
  await ensureShopFeaturesSchema();
  const now = new Date();
<<<<<<< HEAD
  await purgeStaleStockReservations(prisma, organizationId);

=======
>>>>>>> origin/master
  const stale = await prisma.shopHeldBill.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
  });
  for (const bill of stale) {
<<<<<<< HEAD
    await prisma.$transaction(async (tx) => {
      await releaseReservationsForHeldBill(tx, bill.id);
      await tx.shopHeldBill.update({
        where: { id: bill.id },
        data: { status: "EXPIRED" },
      });
=======
    await prisma.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "EXPIRED" },
>>>>>>> origin/master
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
<<<<<<< HEAD
  const expiresAt = new Date(now.getTime() + HOLD_TTL_MS);

  const bill = await prisma.$transaction(async (tx) => {
    await purgeStaleStockReservations(tx, input.organizationId);

    const created = await tx.shopHeldBill.create({
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
        expiresAt,
        createdById: input.userId,
      },
    });

    await createReservationsForHeldBill({
      tx,
      organizationId: input.organizationId,
      heldBillId: created.id,
      expiresAt,
      cartJson: input.cartJson,
    });

    return created;
  });

  const withCreator = await prisma.shopHeldBill.findUniqueOrThrow({
    where: { id: bill.id },
=======
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
>>>>>>> origin/master
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.hold_bill.created",
    entityType: "ShopHeldBill",
    entityId: bill.id,
<<<<<<< HEAD
    after: withCreator,
  });

  return withCreator;
=======
    after: bill,
  });

  return bill;
>>>>>>> origin/master
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
<<<<<<< HEAD
    await prisma.$transaction(async (tx) => {
      await releaseReservationsForHeldBill(tx, bill.id);
      await tx.shopHeldBill.update({
        where: { id: bill.id },
        data: { status: "EXPIRED" },
      });
=======
    await prisma.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "EXPIRED" },
>>>>>>> origin/master
    });
    throw new Error("Held bill has expired");
  }

<<<<<<< HEAD
  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservationsForHeldBill(tx, bill.id);
    return tx.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "RESUMED", resumedAt: new Date() },
    });
=======
  const updated = await prisma.shopHeldBill.update({
    where: { id: bill.id },
    data: { status: "RESUMED", resumedAt: new Date() },
>>>>>>> origin/master
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

<<<<<<< HEAD
  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservationsForHeldBill(tx, bill.id);
    return tx.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
=======
  const updated = await prisma.shopHeldBill.update({
    where: { id: bill.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
>>>>>>> origin/master
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
