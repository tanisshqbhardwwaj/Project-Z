import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { canManageShopPurchases } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createShopSupplier,
  listShopSuppliers,
} from "@/services/shop-purchase.service";

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopPurchases(ctx.role)) requireOwner(ctx);
    const { searchParams } = new URL(request.url);
    const suppliers = await listShopSuppliers(
      ctx.organizationId,
      searchParams.get("q") ?? undefined
    );
    return apiSuccess(serializeBigInt(suppliers));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopPurchases(ctx.role)) requireOwner(ctx);
    const body = await request.json();
    const data = createSchema.parse(body);
    const supplier = await createShopSupplier({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });
    return NextResponse.json({ data: serializeBigInt(supplier) }, { status: 201 });
  });
}
