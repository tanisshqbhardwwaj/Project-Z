import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { canViewShopPurchases, canManageShopPurchases } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createShopPurchase,
  listShopPurchases,
} from "@/services/shop-purchase.service";

const lineSchema = z.object({
  inventoryItemId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  rateRupees: z.number().min(0),
});

const createSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseDate: z.string(),
  billNumber: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
  discountRupees: z.number().min(0).optional(),
  taxRupees: z.number().min(0).optional(),
  extraChargesRupees: z.number().min(0).optional(),
  paidRupees: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]).optional(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopPurchases(ctx.role)) {
      requirePermission(ctx, "shop.purchase.view");
    }
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const data = await listShopPurchases({
      organizationId: ctx.organizationId,
      search: searchParams.get("q") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
      paymentStatus: (searchParams.get("paymentStatus") as "PAID" | "PARTIAL" | "UNPAID") ?? undefined,
      status: searchParams.get("status") === "CANCELLED" ? "CANCELLED" : "ACTIVE",
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sort: searchParams.get("sort") === "oldest" ? "oldest" : "newest",
<<<<<<< HEAD
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
=======
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
>>>>>>> origin/master
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopPurchases(ctx.role)) requireOwner(ctx);
    const body = await request.json();
    const data = createSchema.parse(body);
    const purchase = await createShopPurchase({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      supplierId: data.supplierId,
      purchaseDate: new Date(data.purchaseDate),
      billNumber: data.billNumber,
      lines: data.lines,
      discountRupees: data.discountRupees,
      taxRupees: data.taxRupees,
      extraChargesRupees: data.extraChargesRupees,
      paidRupees: data.paidRupees,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      idempotencyKey: data.idempotencyKey,
    });
    return NextResponse.json({ data: serializeBigInt(purchase) }, { status: 201 });
  });
}
