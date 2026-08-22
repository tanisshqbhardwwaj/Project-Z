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
  createRecurringExpense,
  listRecurringExpenses,
} from "@/services/shop-expense.service";

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  monthlyAmountRupees: z.number().positive(),
  dueDay: z.number().min(1).max(28).optional(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopExpenses(ctx.role)) {
      requirePermission(ctx, "shop.expense.view");
    }
    const items = await listRecurringExpenses(ctx.organizationId);
    return apiSuccess(serializeBigInt(items));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const data = createSchema.parse(await request.json());
    const item = await createRecurringExpense({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      categoryId: data.categoryId,
      name: data.name,
      monthlyAmountRupees: data.monthlyAmountRupees,
      dueDay: data.dueDay,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
    });
    return NextResponse.json({ data: serializeBigInt(item) }, { status: 201 });
  });
}
