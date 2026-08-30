import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createInventoryItem,
  deleteInventoryItem,
  listInventoryForBilling,
  listInventoryItems,
  searchInventoryForBilling,
  updateInventoryItem,
} from "@/services/shop.service";
import { getShopBranchContext, isBranchAll, ensureDefaultBranch } from "@/lib/shop/branch-context";
import { requireInventoryManage } from "@/lib/staff/shop-access";

const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  size: z.string().max(80).optional().nullable(),
  barcode: z.string().optional().nullable(),
  unit: z.string().optional(),
  quantity: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  costRupees: z.number().min(0).optional().nullable(),
  sellRupees: z.number().min(0).optional().nullable(),
  autoBarcode: z.boolean().optional(),
  category: z.string().max(40).optional().nullable(),
  subCategory: z.string().max(40).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  size: z.string().max(80).optional().nullable(),
  barcode: z.string().optional().nullable(),
  sku: z.string().max(64).optional().nullable(),
  generateBarcode: z.boolean().optional(),
  quantity: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  costRupees: z.number().min(0).optional().nullable(),
  sellRupees: z.number().min(0).optional().nullable(),
  category: z.string().max(40).optional().nullable(),
  subCategory: z.string().max(40).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

const deleteItemSchema = z.object({
  itemId: z.string().uuid(),
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
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const forBilling = searchParams.get("for") === "billing";
    const q = searchParams.get("q") ?? undefined;

    if (q) {
      const result = await searchInventoryForBilling(ctx.organizationId, shopCtx.branchId, {
        q,
        limit: Number(searchParams.get("limit") ?? 40),
        cursor: searchParams.get("cursor"),
      });
      return apiSuccess(serializeBigInt(result.items), {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    }

    if (forBilling) {
      const result = await listInventoryForBilling(ctx.organizationId, shopCtx.branchId);
      return apiSuccess(serializeBigInt(result.items), {
        totalCount: result.totalCount,
        searchMode: result.searchMode,
      });
    }

    const items = await listInventoryItems(ctx.organizationId, shopCtx.branchId);
    return apiSuccess(serializeBigInt(items));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireInventoryManage(ctx);
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );

    const body = await request.json();
    const data = createItemSchema.parse(body);

    const branchId = isBranchAll(shopCtx.branchId)
      ? await ensureDefaultBranch(ctx.organizationId)
      : shopCtx.branchId;

    const item = await createInventoryItem({
      organizationId: ctx.organizationId,
      branchId,
      ...data,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    });

    return NextResponse.json({ data: serializeBigInt(item) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireInventoryManage(ctx);
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );

    const body = await request.json();
    const data = updateItemSchema.parse(body);

    const item = await updateInventoryItem({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      branchScope: shopCtx.branchId,
      ...data,
      expiryDate:
        data.expiryDate !== undefined
          ? data.expiryDate
            ? new Date(data.expiryDate)
            : null
          : undefined,
    });

    return apiSuccess(serializeBigInt(item));
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireInventoryManage(ctx);

    const body = await request.json();
    const { itemId } = deleteItemSchema.parse(body);

    await deleteInventoryItem({
      organizationId: ctx.organizationId,
      itemId,
      userId: ctx.userId,
    });

    return apiSuccess({ deleted: true });
  });
}
