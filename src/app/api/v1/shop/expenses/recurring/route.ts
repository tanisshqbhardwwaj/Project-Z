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
import { PAYMENT_METHODS } from "@/lib/validation/shop-return";
import {
  createRecurringExpense,
  getRecurringExpenseOverview,
  listRecurringExpenses,
  syncRecurringExpenseReminders,
} from "@/services/shop/shop-recurring-expense.service";

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(120),
  monthlyAmountRupees: z.number().positive(),
  dueDay: z.number().int().min(1).max(31).optional(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopExpenses(ctx.role)) {
      requirePermission(ctx, "shop.expense.view");
    }
    const { searchParams } = new URL(request.url);

    // `view=rules` keeps the original flat-list response for any older caller.
    if (searchParams.get("view") === "rules") {
      const items = await listRecurringExpenses(ctx.organizationId, {
        includeInactive: searchParams.get("includeInactive") === "1",
      });
      return apiSuccess(serializeBigInt(items));
    }

    const overview = await getRecurringExpenseOverview(ctx.organizationId);
    return apiSuccess(serializeBigInt(overview));
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
      reminderDaysBefore: data.reminderDaysBefore,
      paymentMethod: data.paymentMethod ?? null,
      notes: data.notes,
    });
    await syncRecurringExpenseReminders(ctx.organizationId);
    return NextResponse.json({ data: serializeBigInt(item) }, { status: 201 });
  });
}
