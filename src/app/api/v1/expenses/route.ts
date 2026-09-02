import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  requireProjectAccess,
  apiSuccess,
} from "@/lib/api/context";
import { createExpense, getDefaultCategoryId, listExpenses } from "@/services/finance/expense.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { getAccessibleProjectIds } from "@/lib/permissions/project-scope";

const schema = z.object({
  projectId: z.string({ error: "Please select a work order" }),
  vendorId: z.string().optional(),
  categoryId: z.string().optional(),
  amount: z
    .number({ error: "Please enter an amount" })
    .positive({ error: "Amount must be greater than zero" }),
  expenseDate: z.string({ error: "Please select a date" }),
  description: z.string().min(1, { error: "Please enter why you are paying" }),
  paidByUserId: z.string().optional(),
  paymentMethod: z.string().optional(),
  skipDuplicateCheck: z.boolean().optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "financial.view");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;

    if (projectId) {
      await requireProjectAccess(ctx, projectId);
    }

    const accessibleProjectIds = projectId
      ? undefined
      : await getAccessibleProjectIds(ctx.organizationId, ctx.userId, ctx.role);

    const expenses = await listExpenses(ctx.organizationId, {
      projectId,
      vendorId: searchParams.get("vendorId") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      accessibleProjectIds,
    });

    return apiSuccess(serializeBigInt(expenses));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "expense.create");

    const body = await request.json();
    const data = schema.parse(body);

    await requireProjectAccess(ctx, data.projectId);

    const categoryId = data.categoryId ?? (await getDefaultCategoryId(ctx.organizationId));

    const result = await createExpense({
      organizationId: ctx.organizationId,
      projectId: data.projectId,
      userId: ctx.userId,
      vendorId: data.vendorId,
      categoryId,
      amountPaise: rupeesToPaise(data.amount),
      expenseDate: new Date(data.expenseDate),
      description: data.description.trim(),
      paidByUserId: ctx.userId,
      paymentMethod: data.paymentMethod ?? "CASH",
      skipDuplicateCheck: data.skipDuplicateCheck,
    });

    if (result.duplicate) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_EXPENSE",
            message: "Possible duplicate expense detected",
            details: serializeBigInt(result.duplicate),
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ data: serializeBigInt(result.expense) }, { status: 201 });
  });
}
