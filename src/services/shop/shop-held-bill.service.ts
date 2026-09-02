import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/schema/ensure-shop-features-schema";
import { ensureShopBranchSchema } from "@/lib/shop/schema/ensure-shop-branch-schema";
import { branchWhere, isBranchAll, type BranchScope } from "@/lib/shop/branch/branch-context";
import {
  createReservationsForHeldBill,
  purgeStaleStockReservations,
  releaseReservationsForHeldBill,
} from "@/lib/inventory/stock-reservation";
import { createAuditLog } from "../shared/audit.service";

const HOLD_TTL_MS = 30 * 60 * 1000;
const EXPIRE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const lastExpireSweep = new Map<string, number>();

async function maybeExpireStaleHeldBills(organizationId: string) {
  const now = Date.now();
  const last = lastExpireSweep.get(organizationId) ?? 0;
  if (now - last < EXPIRE_SWEEP_INTERVAL_MS) return;
  lastExpireSweep.set(organizationId, now);
  await expireStaleHeldBills(organizationId);
}

async function ensureHeldBillSchema(organizationId: string) {
  await ensureShopFeaturesSchema();
  await ensureShopBranchSchema(organizationId);
}

export async function expireStaleHeldBills(organizationId: string) {
  await ensureHeldBillSchema(organizationId);
  const now = new Date();
  await purgeStaleStockReservations(prisma, organizationId);

  const stale = await prisma.shopHeldBill.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
  });
  for (const bill of stale) {
    await prisma.$transaction(async (tx) => {
      await releaseReservationsForHeldBill(tx, bill.id);
      await tx.shopHeldBill.update({
        where: { id: bill.id },
        data: { status: "EXPIRED" },
      });
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

async function nextHoldNumber(organizationId: string, branchId: string): Promise<number> {
  const last = await prisma.shopHeldBill.findFirst({
    where: { organizationId, branchId },
    orderBy: { holdNumber: "desc" },
    select: { holdNumber: true },
  });
  return (last?.holdNumber ?? 0) + 1;
}

export async function listActiveHeldBills(organizationId: string, branchId?: BranchScope) {
  await requireModule(organizationId, "shop_sales");
  await maybeExpireStaleHeldBills(organizationId);
  return prisma.shopHeldBill.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      ...(branchId && !isBranchAll(branchId) ? { branchId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createHeldBill(input: {
  organizationId: string;
  branchId: string;
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
  await ensureHeldBillSchema(input.organizationId);
  const holdNumber = await nextHoldNumber(input.organizationId, input.branchId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_TTL_MS);

  const bill = await prisma.$transaction(async (tx) => {
    await purgeStaleStockReservations(tx, input.organizationId);

    const created = await tx.shopHeldBill.create({
      data: {
        organizationId: input.organizationId,
        branchId: input.branchId,
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
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.hold_bill.created",
    entityType: "ShopHeldBill",
    entityId: bill.id,
    after: withCreator,
  });

  return withCreator;
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
    await prisma.$transaction(async (tx) => {
      await releaseReservationsForHeldBill(tx, bill.id);
      await tx.shopHeldBill.update({
        where: { id: bill.id },
        data: { status: "EXPIRED" },
      });
    });
    throw new Error("Held bill has expired");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservationsForHeldBill(tx, bill.id);
    return tx.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "RESUMED", resumedAt: new Date() },
    });
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
  await ensureHeldBillSchema(input.organizationId);
  const bill = await prisma.shopHeldBill.findFirst({
    where: { id: input.heldBillId, organizationId: input.organizationId },
  });
  if (!bill) throw new Error("Held bill not found");
  if (bill.status !== "ACTIVE") throw new Error("Held bill is not active");

  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservationsForHeldBill(tx, bill.id);
    return tx.shopHeldBill.update({
      where: { id: bill.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
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

export async function countActiveHeldBills(
  organizationId: string,
  branchScope?: BranchScope
) {
  await maybeExpireStaleHeldBills(organizationId);
  return prisma.shopHeldBill.count({
    where: { organizationId, status: "ACTIVE", ...branchWhere(branchScope ?? "all") },
  });
}
