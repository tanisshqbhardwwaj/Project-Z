import { Prisma, type OfferDiscountType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import {
  mapDbOffer,
  resolveOfferPreview,
  type OfferCartLine,
  type OfferPreviewResult,
  type OfferSelection,
} from "@/lib/shop/offer-engine";
import { parseInventoryCategory } from "@/lib/shop/inventory-categories";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/ensure-shop-features-schema";
import { createAuditLog } from "./audit.service";

export async function listActiveOffers(organizationId: string, at = new Date()) {
  await requireModule(organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  const rows = await prisma.shopOffer.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isActive: true,
      startDate: { lte: at },
      endDate: { gte: at },
    },
    orderBy: [{ priority: "desc" }, { startDate: "desc" }],
  });
  return rows.map(mapDbOffer);
}

export async function listOffers(organizationId: string, filter?: "active" | "upcoming" | "expired" | "all") {
  await requireModule(organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  const now = new Date();
  let where: Record<string, unknown> = { organizationId, deletedAt: null };
  if (filter === "active") {
    where = { ...where, isActive: true, startDate: { lte: now }, endDate: { gte: now } };
  } else if (filter === "upcoming") {
    where = { ...where, isActive: true, startDate: { gt: now } };
  } else if (filter === "expired") {
    where = { ...where, endDate: { lt: now } };
  }
  return prisma.shopOffer.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function createOffer(input: {
  organizationId: string;
  userId: string;
  name: string;
  description?: string | null;
  discountType: OfferDiscountType;
  discountValue: number;
  productIds?: string[];
  categoryKeys?: string[];
  minQuantity?: number | null;
  minPurchaseRupees?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
  priority?: number;
}) {
  await requireModule(input.organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  const offer = await prisma.shopOffer.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      productIdsJson: input.productIds?.length ? input.productIds : Prisma.DbNull,
      categoryKeysJson: input.categoryKeys?.length ? input.categoryKeys : Prisma.DbNull,
      minQuantity: input.minQuantity ?? null,
      minPurchasePaise:
        input.minPurchaseRupees != null
          ? rupeesToPaise(input.minPurchaseRupees)
          : null,
      buyQuantity: input.buyQuantity ?? null,
      getQuantity: input.getQuantity ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive ?? true,
      priority: input.priority ?? 0,
      createdById: input.userId,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.offer.created",
    entityType: "ShopOffer",
    entityId: offer.id,
    after: offer,
  });

  return offer;
}

export async function updateOffer(input: {
  organizationId: string;
  userId: string;
  offerId: string;
  name?: string;
  description?: string | null;
  discountType?: OfferDiscountType;
  discountValue?: number;
  productIds?: string[];
  categoryKeys?: string[];
  minQuantity?: number | null;
  minPurchaseRupees?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  priority?: number;
}) {
  await requireModule(input.organizationId, "shop_sales");
  const existing = await prisma.shopOffer.findFirst({
    where: { id: input.offerId, organizationId: input.organizationId, deletedAt: null },
  });
  if (!existing) throw new Error("Offer not found");

  const offer = await prisma.shopOffer.update({
    where: { id: input.offerId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.discountType !== undefined && { discountType: input.discountType }),
      ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
      ...(input.productIds !== undefined && {
        productIdsJson: input.productIds.length ? input.productIds : Prisma.DbNull,
      }),
      ...(input.categoryKeys !== undefined && {
        categoryKeysJson: input.categoryKeys.length ? input.categoryKeys : Prisma.DbNull,
      }),
      ...(input.minQuantity !== undefined && { minQuantity: input.minQuantity }),
      ...(input.minPurchaseRupees !== undefined && {
        minPurchasePaise:
          input.minPurchaseRupees != null
            ? rupeesToPaise(input.minPurchaseRupees)
            : null,
      }),
      ...(input.buyQuantity !== undefined && { buyQuantity: input.buyQuantity }),
      ...(input.getQuantity !== undefined && { getQuantity: input.getQuantity }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.priority !== undefined && { priority: input.priority }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: input.isActive === false ? "shop.offer.deactivated" : "shop.offer.updated",
    entityType: "ShopOffer",
    entityId: offer.id,
    before: existing,
    after: offer,
  });

  return offer;
}

export async function deleteOffer(organizationId: string, userId: string, offerId: string) {
  await requireModule(organizationId, "shop_sales");
  const existing = await prisma.shopOffer.findFirst({
    where: { id: offerId, organizationId, deletedAt: null },
  });
  if (!existing) throw new Error("Offer not found");

  const offer = await prisma.shopOffer.update({
    where: { id: offerId },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "shop.offer.deleted",
    entityType: "ShopOffer",
    entityId: offer.id,
    before: existing,
    after: offer,
  });

  return offer;
}

export async function enrichOfferCartLines(
  organizationId: string,
  items: OfferCartLine[]
): Promise<OfferCartLine[]> {
  const ids = items
    .map((i) => i.inventoryItemId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return items;

  const inventory = await prisma.inventoryItem.findMany({
    where: { organizationId, id: { in: ids } },
    select: { id: true, sectorMeta: true },
  });
  const categoryById = new Map(
    inventory.map((i) => [i.id, parseInventoryCategory(i.sectorMeta)])
  );

  return items.map((item) => ({
    ...item,
    categoryKey: item.inventoryItemId
      ? categoryById.get(item.inventoryItemId) ?? item.categoryKey ?? null
      : item.categoryKey ?? null,
  }));
}

export async function previewOffersForCart(
  organizationId: string,
  items: OfferCartLine[],
  selection: OfferSelection = {}
): Promise<OfferPreviewResult> {
  await ensureShopFeaturesSchema();
  const enriched = await enrichOfferCartLines(organizationId, items);
  const offers = await listActiveOffers(organizationId);
  return resolveOfferPreview(enriched, offers, selection);
}

export async function computeOfferDiscountForSale(
  organizationId: string,
  items: Array<{
    name: string;
    qty: number;
    priceRupees: number;
    inventoryItemId?: string;
  }>,
  selection: OfferSelection = {}
) {
  const lines: OfferCartLine[] = items.map((i) => ({
    name: i.name,
    qty: i.qty,
    priceRupees: i.priceRupees,
    inventoryItemId: i.inventoryItemId,
  }));
  return previewOffersForCart(organizationId, lines, selection);
}

export async function recordOfferUsage(
  organizationId: string,
  offerDetails: { offerId: string; discountRupees: number }[]
) {
  for (const d of offerDetails) {
    await prisma.shopOffer.update({
      where: { id: d.offerId, organizationId },
      data: {
        usageCount: { increment: 1 },
        totalDiscountPaise: {
          increment: BigInt(Math.round(d.discountRupees * 100)),
        },
      },
    });
  }
}

export async function countActiveOffers(organizationId: string) {
  await ensureShopFeaturesSchema();
  const now = new Date();
  return prisma.shopOffer.count({
    where: {
      organizationId,
      deletedAt: null,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });
}
