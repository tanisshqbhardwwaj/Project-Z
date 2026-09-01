import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { normalizeBarcode, nextFreeBarcode } from "@/lib/shop/inventory/barcode";
import { ensureCatalogSchema } from "@/lib/shop/schema/ensure-catalog-schema";
import { ensureDefaultBranch } from "@/lib/shop/branch/branch-context";
import { ensureShopBranchSchema } from "@/lib/shop/schema/ensure-shop-branch-schema";
import { mergeInventorySectorMeta } from "@/lib/shop/inventory/inventory-categories";
import { isInfiniteStock, INFINITE_STOCK_QTY } from "@/lib/shop/inventory/inventory";
import { isNonStockItemKind, type ShopItemKind } from "@/lib/shop/branch/sector-mode";
import {
  buildVariantSku,
  variantDisplayName,
  type VariantDescriptor,
} from "@/lib/shop/inventory/variant-display";
import { createAuditLog } from "../shared/audit.service";
import { scheduleShopInventoryAlertSync } from "./shop-notification.service";

export type ProductVariantInput = {
  /** Existing variant id when editing; omitted for new variants. */
  id?: string;
  size?: string | null;
  color?: string | null;
  variantLabel?: string | null;
  barcode?: string | null;
  sku?: string | null;
  quantity?: number;
  reorderLevel?: number;
  sellRupees?: number | null;
  costRupees?: number | null;
  expiryDate?: Date | null;
  supplierName?: string | null;
  batchNo?: string | null;
  attributes?: Record<string, string>;
};

export type CreateProductInput = {
  organizationId: string;
  userId: string;
  branchId?: string | null;
  itemKind?: import("@/lib/shop/branch/sector-mode").ShopItemKind;
  name: string;
  description?: string | null;
  brand?: string | null;
  categoryKey?: string | null;
  subCategoryKey?: string | null;
  unit?: string | null;
  hasVariants: boolean;
  /** What the variants vary by — "size" for clothing, free text otherwise. */
  variantAxis?: string | null;
  supplierName?: string | null;
  batchNo?: string | null;
  attributes?: Record<string, string>;
  notes?: string | null;
  /** Defaults applied to variants that leave the field blank. */
  defaultSellRupees?: number | null;
  defaultCostRupees?: number | null;
  defaultReorderLevel?: number;
  variants: ProductVariantInput[];
  autoBarcode?: boolean;
  autoSku?: boolean;
};

export type SimilarProduct = {
  productId: string | null;
  name: string;
  brand: string | null;
  categoryKey: string | null;
  supplierName: string | null;
  variantCount: number;
  totalQuantity: number;
  sellPaise: string | null;
  createdAt: string;
  variantSummary: string[];
};

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanAttributes(
  attributes: Record<string, string> | undefined
): Record<string, string> {
  if (!attributes) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) out[key] = text.slice(0, 120);
  }
  return out;
}

function toPaise(rupees: number | null | undefined): bigint | null {
  return rupees != null && rupees > 0 ? rupeesToPaise(rupees) : null;
}

/**
 * Products whose name looks like the one being created. Used for the
 * "a similar product already exists" prompt — product names are deliberately
 * NOT unique, because the same shirt can arrive from a different supplier at a
 * different cost as a separate batch.
 */
export async function findSimilarProducts(input: {
  organizationId: string;
  name: string;
  brand?: string | null;
  limit?: number;
}): Promise<SimilarProduct[]> {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const name = input.name.trim();
  if (name.length < 2) return [];

  const products = await prisma.shopProduct.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      name: { contains: name },
    },
    include: {
      variants: {
        select: {
          size: true,
          color: true,
          variantLabel: true,
          quantity: true,
          sellPaise: true,
          barcode: true,
          sku: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 5,
  });

  const fromProducts: SimilarProduct[] = products.map((product) => ({
    productId: product.id,
    name: product.name,
    brand: product.brand,
    categoryKey: product.categoryKey,
    supplierName: product.supplierName,
    variantCount: product.variants.length,
    totalQuantity: product.variants.reduce((sum, v) => sum + v.quantity, 0),
    sellPaise: product.variants.find((v) => v.sellPaise != null)?.sellPaise?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
    variantSummary: product.variants
      .slice(0, 8)
      .map((v) => variantDisplayName({ ...v, productName: product.name })),
  }));

  if (fromProducts.length >= (input.limit ?? 5)) return fromProducts;

  // Inventory rows created before the product table existed have no parent.
  const legacy = await prisma.inventoryItem.findMany({
    where: {
      organizationId: input.organizationId,
      productId: null,
      name: { contains: name },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const legacyByName = new Map<string, typeof legacy>();
  for (const item of legacy) {
    const key = item.name.trim().toLowerCase();
    legacyByName.set(key, [...(legacyByName.get(key) ?? []), item]);
  }

  for (const group of legacyByName.values()) {
    if (fromProducts.length >= (input.limit ?? 5)) break;
    const first = group[0]!;
    fromProducts.push({
      productId: null,
      name: first.name,
      brand: null,
      categoryKey: null,
      supplierName: first.supplierName,
      variantCount: group.length,
      totalQuantity: group.reduce((sum, v) => sum + v.quantity, 0),
      sellPaise: group.find((v) => v.sellPaise != null)?.sellPaise?.toString() ?? null,
      createdAt: first.createdAt.toISOString(),
      variantSummary: group.slice(0, 8).map((v) => variantDisplayName(v)),
    });
  }

  return fromProducts;
}

type PreparedVariant = {
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  barcode: string | null;
  sku: string | null;
  quantity: number;
  reorderLevel: number;
  costPaise: bigint | null;
  sellPaise: bigint | null;
  expiryDate: Date | null;
  supplierName: string | null;
  batchNo: string | null;
  attributes: Record<string, string>;
};

/**
 * Resolves barcodes and SKUs for a whole size run in one pass so that creating
 * S/M/L/XL/XXL yields five distinct barcodes without five database round trips.
 */
async function prepareVariants(input: {
  organizationId: string;
  productName: string;
  itemKind?: ShopItemKind;
  variants: ProductVariantInput[];
  hasVariants: boolean;
  autoBarcode: boolean;
  autoSku: boolean;
  defaultSellRupees?: number | null;
  defaultCostRupees?: number | null;
  defaultReorderLevel?: number;
  productSupplierName: string | null;
  productBatchNo: string | null;
  excludeVariantIds?: string[];
}): Promise<PreparedVariant[]> {
  if (input.variants.length === 0) {
    throw new Error("Add at least one variant");
  }

  const explicitBarcodes: string[] = [];
  for (const variant of input.variants) {
    const code = variant.barcode ? normalizeBarcode(variant.barcode) : "";
    if (code) explicitBarcodes.push(code);
  }

  const duplicateInRequest = explicitBarcodes.find(
    (code, index) => explicitBarcodes.indexOf(code) !== index
  );
  if (duplicateInRequest) {
    throw new Error(
      `Barcode ${duplicateInRequest} is used twice in this product — each size needs its own barcode`
    );
  }

  if (explicitBarcodes.length > 0) {
    const clashes = await prisma.inventoryItem.findMany({
      where: {
        organizationId: input.organizationId,
        barcode: { in: explicitBarcodes },
        ...(input.excludeVariantIds?.length
          ? { NOT: { id: { in: input.excludeVariantIds } } }
          : {}),
      },
      select: { barcode: true, name: true },
    });
    if (clashes.length > 0) {
      throw new Error(
        `Barcode ${clashes[0]!.barcode} is already used by "${clashes[0]!.name}"`
      );
    }
  }

  // Only the barcodes we might collide with, not the whole catalogue.
  const orgSuffix = input.organizationId.slice(-6);
  const existing = await prisma.inventoryItem.findMany({
    where: { organizationId: input.organizationId, barcode: { not: null } },
    select: { barcode: true },
    take: 20000,
  });
  const taken = new Set<string>(
    existing.map((e) => e.barcode).filter((b): b is string => !!b)
  );
  for (const code of explicitBarcodes) taken.add(code);

  const sizesSeen = new Set<string>();
  const prepared: PreparedVariant[] = [];

  for (let index = 0; index < input.variants.length; index++) {
    const variant = input.variants[index]!;
    const size = cleanText(variant.size);
    const color = cleanText(variant.color);

    if (input.hasVariants) {
      const identity = `${size ?? ""}|${color ?? ""}|${cleanText(variant.variantLabel) ?? ""}`;
      if (identity === "||") {
        throw new Error("Each variant needs a size (or a variant name)");
      }
      if (sizesSeen.has(identity)) {
        throw new Error(
          `Duplicate variant ${[color, size].filter(Boolean).join(" / ") || "entry"} — remove one of them`
        );
      }
      sizesSeen.add(identity);
    }

    let barcode = variant.barcode ? normalizeBarcode(variant.barcode) : null;
    if (!barcode && input.autoBarcode) {
      barcode = nextFreeBarcode(orgSuffix, taken, index + 1);
    }

    let sku = cleanText(variant.sku);
    if (!sku && input.autoSku) {
      sku = buildVariantSku({
        productName: input.productName,
        size,
        color,
        index: index + 1,
      });
    }

    const quantity = Math.max(0, variant.quantity ?? 0);
    const itemKind = input.itemKind ?? "PRODUCT";
    const finalQty = isNonStockItemKind(itemKind) ? INFINITE_STOCK_QTY : quantity;
    prepared.push({
      size,
      color,
      variantLabel: cleanText(variant.variantLabel),
      barcode,
      sku,
      quantity: finalQty,
      reorderLevel: isNonStockItemKind(itemKind)
        ? 0
        : Math.max(0, variant.reorderLevel ?? input.defaultReorderLevel ?? 0),
      costPaise: toPaise(variant.costRupees ?? input.defaultCostRupees),
      sellPaise: toPaise(variant.sellRupees ?? input.defaultSellRupees),
      expiryDate: variant.expiryDate ?? null,
      supplierName: cleanText(variant.supplierName) ?? input.productSupplierName,
      batchNo: cleanText(variant.batchNo) ?? input.productBatchNo,
      attributes: cleanAttributes(variant.attributes),
    });
  }

  return prepared;
}

/**
 * Creates ONE parent product plus one inventory row per size/variant, in a
 * single transaction. A product without variants still gets exactly one
 * inventory row so sales, purchases and returns always point at an
 * InventoryItem, whatever the business type.
 */
export async function createShopProduct(input: CreateProductInput) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();
  await ensureShopBranchSchema(input.organizationId);
  const branchId = input.branchId ?? (await ensureDefaultBranch(input.organizationId));

  const name = input.name.trim();
  if (name.length < 1) throw new Error("Product name is required");
  if (name.length > 160) throw new Error("Product name is too long");

  const unit = cleanText(input.unit) ?? "pcs";
  const supplierName = cleanText(input.supplierName);
  const batchNo = cleanText(input.batchNo);
  const description = cleanText(input.description);
  const brand = cleanText(input.brand);
  const categoryKey = cleanText(input.categoryKey);
  const subCategoryKey = cleanText(input.subCategoryKey);
  const productAttributes = cleanAttributes(input.attributes);

  const variantInputs =
    input.variants.length > 0
      ? input.variants
      : // No-variant products still need one stock row.
        [{ quantity: 0 } satisfies ProductVariantInput];

  if (input.hasVariants && variantInputs.length < 1) {
    throw new Error("Add at least one size");
  }

  const prepared = await prepareVariants({
    organizationId: input.organizationId,
    productName: name,
    itemKind: input.itemKind ?? "PRODUCT",
    variants: variantInputs,
    hasVariants: input.hasVariants,
    autoBarcode: input.autoBarcode !== false,
    autoSku: input.autoSku !== false,
    defaultSellRupees: input.defaultSellRupees,
    defaultCostRupees: input.defaultCostRupees,
    defaultReorderLevel: input.defaultReorderLevel,
    productSupplierName: supplierName,
    productBatchNo: batchNo,
  });

  const sectorMeta = mergeInventorySectorMeta(
    {},
    { category: categoryKey, subCategory: subCategoryKey }
  ) as Prisma.InputJsonValue;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.shopProduct.create({
      data: {
        organizationId: input.organizationId,
        createdById: input.userId,
        itemKind: input.itemKind ?? "PRODUCT",
        name,
        description,
        brand,
        categoryKey,
        subCategoryKey,
        unit,
        hasVariants: input.hasVariants,
        variantAxis: input.hasVariants
          ? cleanText(input.variantAxis) ?? "size"
          : null,
        supplierName,
        batchNo,
        attributes: productAttributes as Prisma.InputJsonValue,
        notes: cleanText(input.notes),
      },
    });

    for (const variant of prepared) {
      await tx.inventoryItem.create({
        data: {
          organizationId: input.organizationId,
          branchId,
          productId: created.id,
          name,
          description,
          unit,
          size: variant.size,
          color: variant.color,
          variantLabel: variant.variantLabel,
          barcode: variant.barcode,
          sku: variant.sku,
          quantity: variant.quantity,
          reorderLevel: variant.reorderLevel,
          costPaise: variant.costPaise,
          sellPaise: variant.sellPaise,
          expiryDate: variant.expiryDate,
          supplierName: variant.supplierName,
          batchNo: variant.batchNo,
          attributes: {
            ...productAttributes,
            ...variant.attributes,
          } as Prisma.InputJsonValue,
          sectorMeta,
        },
      });
    }

    return tx.shopProduct.findUniqueOrThrow({
      where: { id: created.id },
      include: { variants: { orderBy: [{ size: "asc" }, { createdAt: "asc" }] } },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.product.created",
    entityType: "ShopProduct",
    entityId: product.id,
    after: {
      name: product.name,
      hasVariants: product.hasVariants,
      variantCount: product.variants.length,
      barcodes: product.variants.map((v) => v.barcode),
    },
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return product;
}

/** Adds more sizes/variants to an existing product without touching its stock. */
export async function addProductVariants(input: {
  organizationId: string;
  userId: string;
  productId: string;
  branchId?: string | null;
  variants: ProductVariantInput[];
  autoBarcode?: boolean;
  autoSku?: boolean;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();
  await ensureShopBranchSchema(input.organizationId);

  const product = await prisma.shopProduct.findFirst({
    where: { id: input.productId, organizationId: input.organizationId, deletedAt: null },
    include: { variants: true },
  });
  if (!product) throw new Error("Product not found");
  if (input.variants.length === 0) throw new Error("Add at least one variant");

  const branchId =
    input.branchId ??
    product.variants.find((v) => v.branchId)?.branchId ??
    (await ensureDefaultBranch(input.organizationId));

  const existingIdentities = new Set(
    product.variants.map(
      (v) => `${v.size ?? ""}|${v.color ?? ""}|${v.variantLabel ?? ""}`
    )
  );
  for (const variant of input.variants) {
    const identity = `${cleanText(variant.size) ?? ""}|${cleanText(variant.color) ?? ""}|${cleanText(variant.variantLabel) ?? ""}`;
    if (existingIdentities.has(identity)) {
      throw new Error(
        `${variantDisplayName({ productName: product.name, ...variant })} already exists on this product`
      );
    }
  }

  const prepared = await prepareVariants({
    organizationId: input.organizationId,
    productName: product.name,
    variants: input.variants,
    hasVariants: true,
    autoBarcode: input.autoBarcode !== false,
    autoSku: input.autoSku !== false,
    productSupplierName: product.supplierName,
    productBatchNo: product.batchNo,
  });

  const sectorMeta = mergeInventorySectorMeta(
    {},
    { category: product.categoryKey, subCategory: product.subCategoryKey }
  ) as Prisma.InputJsonValue;

  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const variant of prepared) {
      rows.push(
        await tx.inventoryItem.create({
          data: {
            organizationId: input.organizationId,
            branchId,
            productId: product.id,
            name: product.name,
            description: product.description,
            unit: product.unit,
            size: variant.size,
            color: variant.color,
            variantLabel: variant.variantLabel,
            barcode: variant.barcode,
            sku: variant.sku,
            quantity: variant.quantity,
            reorderLevel: variant.reorderLevel,
            costPaise: variant.costPaise,
            sellPaise: variant.sellPaise,
            expiryDate: variant.expiryDate,
            supplierName: variant.supplierName,
            batchNo: variant.batchNo,
            attributes: variant.attributes as Prisma.InputJsonValue,
            sectorMeta,
          },
        })
      );
    }
    if (!product.hasVariants) {
      await tx.shopProduct.update({
        where: { id: product.id },
        data: { hasVariants: true, variantAxis: product.variantAxis ?? "size" },
      });
    }
    return rows;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.product.variants_added",
    entityType: "ShopProduct",
    entityId: product.id,
    after: { added: created.map((v) => ({ size: v.size, barcode: v.barcode })) },
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return created;
}

export async function updateShopProduct(input: {
  organizationId: string;
  userId: string;
  productId: string;
  name?: string;
  description?: string | null;
  brand?: string | null;
  categoryKey?: string | null;
  subCategoryKey?: string | null;
  unit?: string | null;
  supplierName?: string | null;
  batchNo?: string | null;
  attributes?: Record<string, string>;
  notes?: string | null;
  variantAxis?: string | null;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const existing = await prisma.shopProduct.findFirst({
    where: { id: input.productId, organizationId: input.organizationId, deletedAt: null },
  });
  if (!existing) throw new Error("Product not found");

  const data: Prisma.ShopProductUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Product name is required");
    data.name = name;
  }
  if (input.description !== undefined) data.description = cleanText(input.description);
  if (input.brand !== undefined) data.brand = cleanText(input.brand);
  if (input.categoryKey !== undefined) data.categoryKey = cleanText(input.categoryKey);
  if (input.subCategoryKey !== undefined) {
    data.subCategoryKey = cleanText(input.subCategoryKey);
  }
  if (input.unit !== undefined) data.unit = cleanText(input.unit) ?? "pcs";
  if (input.supplierName !== undefined) data.supplierName = cleanText(input.supplierName);
  if (input.batchNo !== undefined) data.batchNo = cleanText(input.batchNo);
  if (input.notes !== undefined) data.notes = cleanText(input.notes);
  if (input.variantAxis !== undefined) data.variantAxis = cleanText(input.variantAxis);
  if (input.attributes !== undefined) {
    data.attributes = cleanAttributes(input.attributes) as Prisma.InputJsonValue;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const product = await tx.shopProduct.update({
      where: { id: existing.id },
      data,
    });

    // Variants mirror the product's identity fields so every downstream query
    // (POS search, receipts, reports) shows consistent names and categories.
    const variantPatch: Prisma.InventoryItemUpdateManyMutationInput = {};
    if (input.name !== undefined) variantPatch.name = product.name;
    if (input.description !== undefined) variantPatch.description = product.description;
    if (input.unit !== undefined) variantPatch.unit = product.unit;
    if (input.categoryKey !== undefined || input.subCategoryKey !== undefined) {
      variantPatch.sectorMeta = mergeInventorySectorMeta(
        {},
        { category: product.categoryKey, subCategory: product.subCategoryKey }
      ) as Prisma.InputJsonValue;
    }
    if (Object.keys(variantPatch).length > 0) {
      await tx.inventoryItem.updateMany({
        where: { productId: product.id, organizationId: input.organizationId },
        data: variantPatch,
      });
    }

    return tx.shopProduct.findUniqueOrThrow({
      where: { id: product.id },
      include: { variants: { orderBy: [{ size: "asc" }, { createdAt: "asc" }] } },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.product.updated",
    entityType: "ShopProduct",
    entityId: updated.id,
    before: existing,
    after: { name: updated.name, categoryKey: updated.categoryKey },
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return updated;
}

export async function getShopProduct(organizationId: string, productId: string) {
  await requireModule(organizationId, "shop_inventory");
  await ensureCatalogSchema();
  const product = await prisma.shopProduct.findFirst({
    where: { id: productId, organizationId, deletedAt: null },
    include: { variants: { orderBy: [{ size: "asc" }, { createdAt: "asc" }] } },
  });
  if (!product) throw new Error("Product not found");
  return product;
}

export async function deleteShopProduct(input: {
  organizationId: string;
  userId: string;
  productId: string;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const product = await prisma.shopProduct.findFirst({
    where: { id: input.productId, organizationId: input.organizationId, deletedAt: null },
    include: { variants: true },
  });
  if (!product) throw new Error("Product not found");

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.deleteMany({
      where: { productId: product.id, organizationId: input.organizationId },
    });
    await tx.shopProduct.update({
      where: { id: product.id },
      data: { deletedAt: new Date() },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.product.deleted",
    entityType: "ShopProduct",
    entityId: product.id,
    before: { name: product.name, variantCount: product.variants.length },
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return { deletedVariants: product.variants.length };
}

export type ProductListVariant = {
  id: string;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  displayName: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  sellPaise: string | null;
  costPaise: string | null;
  expiryDate: string | null;
  supplierName: string | null;
  batchNo: string | null;
  attributes: Record<string, unknown>;
  isLowStock: boolean;
  isUnlimited: boolean;
};

export type ProductListRow = {
  id: string | null;
  /** Stable key for React lists; equals the product id, or `legacy:<name>`. */
  key: string;
  name: string;
  description: string | null;
  brand: string | null;
  categoryKey: string | null;
  subCategoryKey: string | null;
  unit: string;
  hasVariants: boolean;
  variantAxis: string | null;
  supplierName: string | null;
  batchNo: string | null;
  attributes: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  variants: ProductListVariant[];
  totalQuantity: number;
  lowStockCount: number;
  /** Rows still living outside the product table (created before variants). */
  isLegacy: boolean;
};

function toListVariant(
  productName: string,
  variant: {
    id: string;
    name: string;
    size: string | null;
    color: string | null;
    variantLabel: string | null;
    sku: string | null;
    barcode: string | null;
    unit: string;
    quantity: number;
    reorderLevel: number;
    sellPaise: bigint | null;
    costPaise: bigint | null;
    expiryDate: Date | null;
    supplierName: string | null;
    batchNo: string | null;
    attributes: unknown;
  }
): ProductListVariant {
  const descriptor: VariantDescriptor = {
    productName,
    name: variant.name,
    size: variant.size,
    color: variant.color,
    variantLabel: variant.variantLabel,
    sku: variant.sku,
    barcode: variant.barcode,
    unit: variant.unit,
    attributes: variant.attributes,
  };
  const unlimited = isInfiniteStock(variant.quantity);
  return {
    id: variant.id,
    size: variant.size,
    color: variant.color,
    variantLabel: variant.variantLabel,
    displayName: variantDisplayName(descriptor),
    sku: variant.sku,
    barcode: variant.barcode,
    unit: variant.unit,
    quantity: variant.quantity,
    reorderLevel: variant.reorderLevel,
    sellPaise: variant.sellPaise?.toString() ?? null,
    costPaise: variant.costPaise?.toString() ?? null,
    expiryDate: variant.expiryDate?.toISOString() ?? null,
    supplierName: variant.supplierName,
    batchNo: variant.batchNo,
    attributes:
      variant.attributes && typeof variant.attributes === "object"
        ? (variant.attributes as Record<string, unknown>)
        : {},
    isLowStock: !unlimited && variant.quantity <= variant.reorderLevel,
    isUnlimited: unlimited,
  };
}

/**
 * Product list for the inventory screen: one row per product with its variants
 * nested inside, so a T-shirt in five sizes reads as ONE product.
 */
export async function listShopProducts(
  organizationId: string
): Promise<ProductListRow[]> {
  await requireModule(organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const [products, orphans] = await Promise.all([
    prisma.shopProduct.findMany({
      where: { organizationId, deletedAt: null },
      include: { variants: { orderBy: [{ size: "asc" }, { createdAt: "asc" }] } },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { organizationId, productId: null },
      orderBy: [{ name: "asc" }, { size: "asc" }],
    }),
  ]);

  const rows: ProductListRow[] = products.map((product) => {
    const variants = product.variants.map((v) => toListVariant(product.name, v));
    return {
      id: product.id,
      key: product.id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      categoryKey: product.categoryKey,
      subCategoryKey: product.subCategoryKey,
      unit: product.unit,
      hasVariants: product.hasVariants,
      variantAxis: product.variantAxis,
      supplierName: product.supplierName,
      batchNo: product.batchNo,
      attributes:
        product.attributes && typeof product.attributes === "object"
          ? (product.attributes as Record<string, unknown>)
          : {},
      notes: product.notes,
      createdAt: product.createdAt.toISOString(),
      variants,
      totalQuantity: variants.reduce((sum, v) => sum + v.quantity, 0),
      lowStockCount: variants.filter((v) => v.isLowStock).length,
      isLegacy: false,
    };
  });

  // Group legacy rows by name so old data reads the same way as new products.
  const legacyGroups = new Map<string, typeof orphans>();
  for (const item of orphans) {
    const key = item.name.trim().toLowerCase();
    legacyGroups.set(key, [...(legacyGroups.get(key) ?? []), item]);
  }
  for (const [key, group] of legacyGroups) {
    const first = group[0]!;
    const variants = group.map((v) => toListVariant(first.name, v));
    const meta = first.sectorMeta as Record<string, unknown> | null;
    rows.push({
      id: null,
      key: `legacy:${key}`,
      name: first.name,
      description: first.description,
      brand: null,
      categoryKey: typeof meta?.category === "string" ? meta.category : null,
      subCategoryKey: typeof meta?.subCategory === "string" ? meta.subCategory : null,
      unit: first.unit,
      hasVariants: group.length > 1 || group.some((v) => !!v.size),
      variantAxis: group.some((v) => !!v.size) ? "size" : null,
      supplierName: first.supplierName,
      batchNo: first.batchNo,
      attributes: {},
      notes: null,
      createdAt: first.createdAt.toISOString(),
      variants,
      totalQuantity: variants.reduce((sum, v) => sum + v.quantity, 0),
      lowStockCount: variants.filter((v) => v.isLowStock).length,
      isLegacy: true,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One-time migration helper: gives every parentless inventory row a product so
 * legacy catalogues gain variant grouping. Idempotent and safe to re-run.
 */
export async function adoptLegacyInventoryIntoProducts(input: {
  organizationId: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const orphans = await prisma.inventoryItem.findMany({
    where: { organizationId: input.organizationId, productId: null },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
  if (orphans.length === 0) return { products: 0, variants: 0 };

  const groups = new Map<string, typeof orphans>();
  for (const item of orphans) {
    const key = item.name.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  let productCount = 0;
  let variantCount = 0;

  for (const group of groups.values()) {
    const first = group[0]!;
    const meta = first.sectorMeta as Record<string, unknown> | null;
    const hasVariants = group.length > 1 || group.some((v) => !!v.size);

    await prisma.$transaction(async (tx) => {
      const product = await tx.shopProduct.create({
        data: {
          organizationId: input.organizationId,
          createdById: input.userId,
          name: first.name,
          description: first.description,
          unit: first.unit,
          categoryKey: typeof meta?.category === "string" ? meta.category : null,
          subCategoryKey:
            typeof meta?.subCategory === "string" ? meta.subCategory : null,
          hasVariants,
          variantAxis: hasVariants ? "size" : null,
          supplierName: first.supplierName,
          batchNo: first.batchNo,
        },
      });
      await tx.inventoryItem.updateMany({
        where: { id: { in: group.map((v) => v.id) } },
        data: { productId: product.id },
      });
    });

    productCount++;
    variantCount += group.length;
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.product.adopted_legacy",
    entityType: "ShopProduct",
    entityId: input.organizationId,
    after: { products: productCount, variants: variantCount },
  });

  return { products: productCount, variants: variantCount };
}
