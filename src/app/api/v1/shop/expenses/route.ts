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
import { createShopExpense, listShopExpenses } from "@/services/shop-expense.service";

const createSchema = z.object({
  categoryId: z.string().uuid(),
  expenseDate: z.string(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  amountRupees: z.number().positive(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]).optional(),
  paidBy: z.string().optional().nullable(),
  expenseType: z.enum(["DAILY", "MONTHLY", "ONE_TIME"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canViewShopExpenses(ctx.role)) {
      requirePermission(ctx, "shop.expense.view");
    }
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const data = await listShopExpenses({
      organizationId: ctx.organizationId,
      search: searchParams.get("q") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      expenseType: (searchParams.get("type") as "DAILY" | "MONTHLY" | "ONE_TIME") ?? undefined,
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
    if (!canManageShopExpenses(ctx.role)) requireOwner(ctx);
    const body = await request.json();
    const data = createSchema.parse(body);
    const expense = await createShopExpense({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      categoryId: data.categoryId,
      expenseDate: new Date(data.expenseDate),
      title: data.title,
      description: data.description,
      amountRupees: data.amountRupees,
      paymentMethod: data.paymentMethod,
      paidBy: data.paidBy,
      expenseType: data.expenseType,
      notes: data.notes,
    });
    return NextResponse.json({ data: serializeBigInt(expense) }, { status: 201 });
  });
}
