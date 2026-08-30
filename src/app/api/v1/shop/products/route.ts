import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { createProductSchema } from "@/lib/validation/shop-product";
import {
  createShopProduct,
  listShopProducts,
  type ProductVariantInput,
} from "@/services/shop-product.service";
import { getShopBranchContext, isBranchAll, ensureDefaultBranch } from "@/lib/shop/branch-context";

function toVariantInput(
  variant: (typeof createProductSchema)["_output"]["variants"][number]
): ProductVariantInput {
  return {
    size: variant.size,
    color: variant.color,
    variantLabel: variant.variantLabel,
    barcode: variant.barcode,
    sku: variant.sku,
    quantity: variant.quantity,
    reorderLevel: variant.reorderLevel,
    sellRupees: variant.sellRupees,
    costRupees: variant.costRupees,
    expiryDate: variant.expiryDate ? new Date(variant.expiryDate) : null,
    supplierName: variant.supplierName,
    batchNo: variant.batchNo,
    attributes: variant.attributes,
  };
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.inventory.manage");
    }
    const products = await listShopProducts(ctx.organizationId);
    return apiSuccess(serializeBigInt(products));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const branchId = isBranchAll(shopCtx.branchId)
      ? await ensureDefaultBranch(ctx.organizationId)
      : shopCtx.branchId;

    const data = createProductSchema.parse(await request.json());

    const product = await createShopProduct({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      branchId,
      name: data.name,
      description: data.description,
      brand: data.brand,
      categoryKey: data.categoryKey,
      subCategoryKey: data.subCategoryKey,
      unit: data.unit,
      hasVariants: data.hasVariants,
      variantAxis: data.variantAxis,
      supplierName: data.supplierName,
      batchNo: data.batchNo,
      attributes: data.attributes,
      notes: data.notes,
      defaultSellRupees: data.defaultSellRupees,
      defaultCostRupees: data.defaultCostRupees,
      defaultReorderLevel: data.defaultReorderLevel,
      itemKind: data.itemKind,
      variants: data.variants.map(toVariantInput),
      autoBarcode: data.autoBarcode,
      autoSku: data.autoSku,
    });

    return NextResponse.json({ data: serializeBigInt(product) }, { status: 201 });
  });
}
