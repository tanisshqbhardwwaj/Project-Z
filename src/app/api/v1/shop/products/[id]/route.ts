import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  addVariantsSchema,
  updateProductSchema,
} from "@/lib/validation/shop-product";
import {
  addProductVariants,
  deleteShopProduct,
  getShopProduct,
  updateShopProduct,
} from "@/services/shop-product.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.inventory.manage");
    }
    const { id } = await context.params;
    const product = await getShopProduct(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(product));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const { id } = await context.params;
    const data = updateProductSchema.parse(await request.json());
    const product = await updateShopProduct({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: id,
      ...data,
    });
    return apiSuccess(serializeBigInt(product));
  });
}

/** Adds more sizes/variants to a product that already exists. */
export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const { id } = await context.params;
    const data = addVariantsSchema.parse(await request.json());
    const variants = await addProductVariants({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: id,
      autoBarcode: data.autoBarcode,
      autoSku: data.autoSku,
      variants: data.variants.map((variant) => ({
        ...variant,
        expiryDate: variant.expiryDate ? new Date(variant.expiryDate) : null,
      })),
    });
    return NextResponse.json({ data: serializeBigInt(variants) }, { status: 201 });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const { id } = await context.params;
    const result = await deleteShopProduct({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: id,
    });
    return apiSuccess(result);
  });
}
