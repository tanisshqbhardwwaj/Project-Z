import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { canViewShopExpenses, canManageShopExpenses } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createShopExpenseCategory,
  listShopExpenseCategories,
} from "@/services/shop-expense.service";

const createSchema = z.object({ name: z.string().min(2) });

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopExpenses(ctx.role)) {
      requirePermission(ctx, "shop.expense.view");
    }
    const categories = await listShopExpenseCategories(ctx.organizationId);
    return apiSuccess(serializeBigInt(categories));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const data = createSchema.parse(await request.json());
    const category = await createShopExpenseCategory({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: data.name,
    });
    return NextResponse.json({ data: serializeBigInt(category) }, { status: 201 });
  });
}
