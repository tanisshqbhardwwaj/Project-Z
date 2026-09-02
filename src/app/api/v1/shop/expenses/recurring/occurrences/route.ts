import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { canManageShopExpenses, canViewShopExpenses } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { PAYMENT_METHODS } from "@/lib/validation/shop-return";
import {
  getRecurringExpenseOverview,
  markOccurrencePaid,
  reopenOccurrence,
  skipOccurrence,
  syncRecurringExpenseReminders,
} from "@/services/shop/shop-recurring-expense.service";

const actionSchema = z.object({
  occurrenceId: z.string().uuid(),
  action: z.enum(["pay", "skip", "reopen"]),
  paidAmountRupees: z.number().positive().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paidAt: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopExpenses(ctx.role)) {
      requirePermission(ctx, "shop.expense.view");
    }
    const overview = await getRecurringExpenseOverview(ctx.organizationId);
    return apiSuccess(serializeBigInt(overview));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const data = actionSchema.parse(await request.json());

    const shared = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      occurrenceId: data.occurrenceId,
    };

    const result =
      data.action === "pay"
        ? await markOccurrencePaid({
            ...shared,
            paidAmountRupees: data.paidAmountRupees,
            paymentMethod: data.paymentMethod,
            paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
            notes: data.notes,
          })
        : data.action === "skip"
          ? await skipOccurrence({ ...shared, notes: data.notes })
          : await reopenOccurrence(shared);

    await syncRecurringExpenseReminders(ctx.organizationId);
    return apiSuccess(serializeBigInt(result));
  });
}
