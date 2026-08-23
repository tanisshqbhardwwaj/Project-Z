import { prisma } from "@/lib/db/prisma";
import { requireModule, getOrgModuleContext } from "@/lib/org/require-module";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";
import {
  categoriesForSectors,
  catalogCategoryLabel,
  catalogSubCategoryLabel,
  customCategoryKey,
  isCustomCategoryKey,
} from "@/lib/shop/category-catalog";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";
import { createAuditLog } from "./audit.service";

export type ResolvedCategory = {
  key: string;
  label: string;
  parentKey: string | null;
  isCustom: boolean;
  /** Business type this category came from, or null for custom ones. */
  sectorKey: string | null;
  subcategories: Array<{ key: string; label: string; isCustom: boolean }>;
};

/** Business types selected for the org, primary sector first. */
export async function getOrgBusinessTypes(organizationId: string) {
  const { org, settings } = await getOrgModuleContext(organizationId);
  return {
    businessTypes: resolveShopBusinessTypes(settings, org.shopSector),
    primarySector: org.shopSector,
  };
}

/**
 * Categories the org can pick from: predefined ones for every selected business
 * type, plus custom ones the user added. Custom rows can also extend a
 * predefined category as a sub-category.
 */
export async function listShopCategories(
  organizationId: string
): Promise<ResolvedCategory[]> {
  await requireModule(organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const { businessTypes } = await getOrgBusinessTypes(organizationId);
  const custom = await prisma.shopCategory.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const byKey = new Map<string, ResolvedCategory>();
  for (const category of categoriesForSectors(businessTypes)) {
    byKey.set(category.key, {
      key: category.key,
      label: category.label,
      parentKey: null,
      isCustom: false,
      sectorKey: category.sector,
      subcategories: category.subcategories.map((s) => ({
        key: s.key,
        label: s.label,
        isCustom: false,
      })),
    });
  }

  const orphanChildren: typeof custom = [];
  for (const row of custom) {
    if (row.parentKey) {
      const parent = byKey.get(row.parentKey);
      if (parent) {
        parent.subcategories.unshift({
          key: row.key,
          label: row.label,
          isCustom: true,
        });
      } else {
        orphanChildren.push(row);
      }
      continue;
    }
    byKey.set(row.key, {
      key: row.key,
      label: row.label,
      parentKey: null,
      isCustom: true,
      sectorKey: row.sectorKey,
      subcategories: [
        { key: "general", label: "General", isCustom: false },
        { key: "misc", label: "Miscellaneous", isCustom: false },
      ],
    });
  }

  // A custom sub-category whose parent belongs to a business type that was later
  // deselected still needs a home, so promote it to a top-level category.
  for (const row of orphanChildren) {
    byKey.set(row.key, {
      key: row.key,
      label: row.label,
      parentKey: null,
      isCustom: true,
      sectorKey: row.sectorKey,
      subcategories: [{ key: "general", label: "General", isCustom: false }],
    });
  }

  const customFirst = [...byKey.values()];
  return customFirst.sort((a, b) => {
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    return 0;
  });
}

export async function createShopCategory(input: {
  organizationId: string;
  userId: string;
  label: string;
  parentKey?: string | null;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  const label = input.label.trim();
  if (label.length < 2) throw new Error("Category name must be at least 2 characters");
  if (label.length > 60) throw new Error("Category name is too long");

  const existingLabel = await prisma.shopCategory.findFirst({
    where: { organizationId: input.organizationId, label },
  });
  if (existingLabel) {
    if (!existingLabel.isActive) {
      return prisma.shopCategory.update({
        where: { id: existingLabel.id },
        data: { isActive: true, parentKey: input.parentKey ?? null },
      });
    }
    throw new Error(`Category "${label}" already exists`);
  }

  let key = customCategoryKey(label);
  for (let attempt = 1; attempt < 20; attempt++) {
    const clash = await prisma.shopCategory.findUnique({
      where: { organizationId_key: { organizationId: input.organizationId, key } },
    });
    if (!clash) break;
    key = `${customCategoryKey(label)}-${attempt}`;
  }

  const { primarySector } = await getOrgBusinessTypes(input.organizationId);
  const category = await prisma.shopCategory.create({
    data: {
      organizationId: input.organizationId,
      key,
      label,
      parentKey: input.parentKey?.trim() || null,
      sectorKey: primarySector ?? null,
      isCustom: true,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.category.created",
    entityType: "ShopCategory",
    entityId: category.id,
    after: category,
  });

  return category;
}

export async function deleteShopCategory(input: {
  organizationId: string;
  userId: string;
  key: string;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureCatalogSchema();

  if (!isCustomCategoryKey(input.key)) {
    throw new Error("Only custom categories can be removed");
  }

  const existing = await prisma.shopCategory.findUnique({
    where: {
      organizationId_key: { organizationId: input.organizationId, key: input.key },
    },
  });
  if (!existing) throw new Error("Category not found");

  const inUse = await prisma.shopProduct.count({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      OR: [{ categoryKey: input.key }, { subCategoryKey: input.key }],
    },
  });
  if (inUse > 0) {
    throw new Error(
      `${existing.label} is used by ${inUse} product${inUse === 1 ? "" : "s"}. Move those products first.`
    );
  }

  // Soft-hide rather than delete so historic products keep resolving the label.
  const updated = await prisma.shopCategory.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.category.removed",
    entityType: "ShopCategory",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

/**
 * Label resolver that also covers custom categories, for server-rendered
 * receipts and reports.
 */
export async function buildCategoryLabelResolver(organizationId: string) {
  await ensureCatalogSchema();
  const custom = await prisma.shopCategory.findMany({
    where: { organizationId },
    select: { key: true, label: true },
  });
  const customByKey = new Map(custom.map((c) => [c.key, c.label]));

  return {
    categoryLabel(key: string | null | undefined): string {
      if (!key) return "Uncategorized";
      return customByKey.get(key) ?? catalogCategoryLabel(key) ?? key;
    },
    subCategoryLabel(
      categoryKey: string | null | undefined,
      subKey: string | null | undefined
    ): string {
      if (!subKey) return "";
      return (
        customByKey.get(subKey) ?? catalogSubCategoryLabel(categoryKey, subKey) ?? subKey
      );
    },
  };
}
