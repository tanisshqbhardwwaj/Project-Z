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
  listInventoryItems,
  updateInventoryItem,
} from "@/services/shop.service";

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
});

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  size: z.string().max(80).optional().nullable(),
  barcode: z.string().optional().nullable(),
  generateBarcode: z.boolean().optional(),
  quantity: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  costRupees: z.number().min(0).optional().nullable(),
  sellRupees: z.number().min(0).optional().nullable(),
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
    const items = await listInventoryItems(ctx.organizationId);
    return apiSuccess(serializeBigInt(items));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");

    const body = await request.json();
    const data = createItemSchema.parse(body);

    const item = await createInventoryItem({
      organizationId: ctx.organizationId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(item) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");

    const body = await request.json();
    const data = updateItemSchema.parse(body);

    const item = await updateInventoryItem({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(item));
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");

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
