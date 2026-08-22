import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { canViewShopPurchases, canManageShopPurchases } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  cancelShopPurchase,
  getShopPurchase,
  updateShopPurchase,
} from "@/services/shop-purchase.service";

const lineSchema = z.object({
  inventoryItemId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  rateRupees: z.number().min(0),
});

const updateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  purchaseDate: z.string().optional(),
  billNumber: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1).optional(),
  discountRupees: z.number().min(0).optional(),
  taxRupees: z.number().min(0).optional(),
  extraChargesRupees: z.number().min(0).optional(),
  paidRupees: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopPurchases(ctx.role)) requireOwner(ctx);
    const { id } = await params;
    const purchase = await getShopPurchase(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(purchase));
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopPurchases(ctx.role)) requireOwner(ctx);
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);
    const purchase = await updateShopPurchase({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      purchaseId: id,
      supplierId: data.supplierId,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      billNumber: data.billNumber,
      lines: data.lines,
      discountRupees: data.discountRupees,
      taxRupees: data.taxRupees,
      extraChargesRupees: data.extraChargesRupees,
      paidRupees: data.paidRupees,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
    return apiSuccess(serializeBigInt(purchase));
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopPurchases(ctx.role)) requireOwner(ctx);
    const { id } = await params;
    const purchase = await cancelShopPurchase({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      purchaseId: id,
    });
    return apiSuccess(serializeBigInt(purchase));
  });
}
