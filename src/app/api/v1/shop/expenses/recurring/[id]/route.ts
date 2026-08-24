import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { canManageShopExpenses } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { PAYMENT_METHODS } from "@/lib/validation/shop-return";
import {
  deleteRecurringExpense,
  syncRecurringExpenseReminders,
  updateRecurringExpense,
} from "@/services/shop-recurring-expense.service";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2).max(120).optional(),
  monthlyAmountRupees: z.number().positive().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const { id } = await context.params;
    const data = patchSchema.parse(await request.json());
    const updated = await updateRecurringExpense({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      recurringId: id,
      categoryId: data.categoryId,
      name: data.name,
      monthlyAmountRupees: data.monthlyAmountRupees,
      dueDay: data.dueDay,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:
        data.endDate === undefined ? undefined : data.endDate ? new Date(data.endDate) : null,
      isActive: data.isActive,
      reminderDaysBefore: data.reminderDaysBefore,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
    await syncRecurringExpenseReminders(ctx.organizationId);
    return apiSuccess(serializeBigInt(updated));
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const { id } = await context.params;
    const removed = await deleteRecurringExpense({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      recurringId: id,
    });
    await syncRecurringExpenseReminders(ctx.organizationId);
    return apiSuccess(serializeBigInt(removed));
  });
}
