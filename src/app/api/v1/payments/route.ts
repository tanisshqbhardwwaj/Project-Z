import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requirePermission, apiSuccess } from "@/lib/api/context";
import { createPayment } from "@/services/payment.service";
import { listExpenses } from "@/services/expense.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().optional(),
  vendorId: z.string().optional(),
  paidByUserId: z.string(),
  recipientUserId: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]),
  referenceNumber: z.string().optional(),
  paymentDate: z.string(),
  paymentType: z.enum(["VENDOR", "SETTLEMENT", "OTHER"]).default("VENDOR"),
  notes: z.string().optional(),
  allocations: z
    .array(z.object({ expenseId: z.string(), amount: z.number().positive() }))
    .optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { searchParams } = new URL(request.url);

    const payments = await prisma.payment.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(searchParams.get("projectId") && { projectId: searchParams.get("projectId")! }),
        ...(searchParams.get("vendorId") && { vendorId: searchParams.get("vendorId")! }),
      },
      include: {
        vendor: true,
        paidBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        allocations: { include: { expense: true } },
      },
      orderBy: { paymentDate: "desc" },
      take: 50,
    });

    return apiSuccess(serializeBigInt(payments));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "payment.create");

    const body = await request.json();
    const data = schema.parse(body);

    const payment = await createPayment({
      organizationId: ctx.organizationId,
      projectId: data.projectId,
      vendorId: data.vendorId,
      paidByUserId: data.paidByUserId,
      recipientUserId: data.recipientUserId,
      amountPaise: rupeesToPaise(data.amount),
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      paymentDate: new Date(data.paymentDate),
      paymentType: data.paymentType,
      notes: data.notes,
      userId: ctx.userId,
      allocations: data.allocations?.map((a) => ({
        expenseId: a.expenseId,
        amountPaise: rupeesToPaise(a.amount),
      })),
    });

    return NextResponse.json({ data: serializeBigInt(payment) }, { status: 201 });
  });
}
