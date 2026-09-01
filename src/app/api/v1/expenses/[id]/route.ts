import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  requireProjectAccess,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { updateOwnExpense } from "@/services/finance/expense.service";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";

const schema = z.object({
  amount: z.number().positive({ error: "Amount must be greater than zero" }),
  expenseDate: z.string({ error: "Please select a date" }),
  description: z.string().min(1, { error: "Please enter a description" }),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "expense.edit_own");

    const expense = await prisma.expense.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { projectId: true },
    });
    if (!expense) {
      throw new ApiError(404, "NOT_FOUND", "Expense not found");
    }

    await requireProjectAccess(ctx, expense.projectId);

    const body = await request.json();
    const data = schema.parse(body);

    const updated = await updateOwnExpense({
      expenseId: id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      amountPaise: rupeesToPaise(data.amount),
      description: data.description.trim(),
      expenseDate: new Date(data.expenseDate),
    });

    return apiSuccess(serializeBigInt(updated));
  });
}
