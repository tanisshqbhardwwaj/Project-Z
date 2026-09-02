import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { canViewShopExpenses, canManageShopExpenses } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  deleteShopExpense,
  getShopExpense,
  updateShopExpense,
} from "@/services/shop/shop-expense.service";

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  expenseDate: z.string().optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  amountRupees: z.number().positive().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]).optional(),
  paidBy: z.string().optional().nullable(),
  expenseType: z.enum(["DAILY", "MONTHLY", "ONE_TIME"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    if (!canViewShopExpenses(ctx.role)) requireOwner(ctx);
    const { id } = await params;
    const expense = await getShopExpense(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(expense));
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const { id } = await params;
    const data = updateSchema.parse(await request.json());
    const expense = await updateShopExpense({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      expenseId: id,
      categoryId: data.categoryId,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
      title: data.title,
      description: data.description,
      amountRupees: data.amountRupees,
      paymentMethod: data.paymentMethod,
      paidBy: data.paidBy,
      expenseType: data.expenseType,
      notes: data.notes,
    });
    return apiSuccess(serializeBigInt(expense));
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const { id } = await params;
    const expense = await deleteShopExpense({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      expenseId: id,
    });
    return apiSuccess(serializeBigInt(expense));
  });
}
