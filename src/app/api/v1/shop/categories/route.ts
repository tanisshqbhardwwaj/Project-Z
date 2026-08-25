import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import {
  createShopCategory,
  deleteShopCategory,
  getOrgBusinessTypes,
  listShopCategories,
} from "@/services/shop-category.service";

const createSchema = z.object({
  label: z.string().min(2).max(60),
  parentKey: z.string().max(80).optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.inventory.manage");
    }
    const [categories, businessTypes] = await Promise.all([
      listShopCategories(ctx.organizationId),
      getOrgBusinessTypes(ctx.organizationId),
    ]);
    return apiSuccess({ categories, ...businessTypes });
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const data = createSchema.parse(await request.json());
    const category = await createShopCategory({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      label: data.label,
      parentKey: data.parentKey,
    });
    return NextResponse.json({ data: category }, { status: 201 });
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) throw new Error("Category key is required");
    const removed = await deleteShopCategory({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      key,
    });
    return apiSuccess(removed);
  });
}
