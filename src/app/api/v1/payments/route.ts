import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  requireProjectAccess,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { createPayment } from "@/services/finance/payment.service";
import { listExpenses } from "@/services/finance/expense.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { prisma } from "@/lib/db/prisma";
import { getAccessibleProjectIds, projectIdScope } from "@/lib/permissions/project-scope";
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
    requirePermission(ctx, "financial.view");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;

    if (projectId) {
      await requireProjectAccess(ctx, projectId);
    }

    const accessibleProjectIds = projectId
      ? null
      : await getAccessibleProjectIds(ctx.organizationId, ctx.userId, ctx.role);

    const payments = await prisma.payment.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(projectId
          ? { projectId }
          : projectIdScope(accessibleProjectIds)),
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

    if (data.projectId) {
      await requireProjectAccess(ctx, data.projectId);
    }

    if (data.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: data.vendorId,
          organizationId: ctx.organizationId,
          deletedAt: null,
        },
      });
      if (!vendor) {
        throw new ApiError(404, "NOT_FOUND", "Vendor not found");
      }
    }

    const payerMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organizationId,
          userId: data.paidByUserId,
        },
      },
    });
    if (!payerMember || payerMember.status !== "ACTIVE") {
      throw new ApiError(400, "VALIDATION_ERROR", "Payer must be an active org member");
    }

    if (data.recipientUserId) {
      const recipientMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: ctx.organizationId,
            userId: data.recipientUserId,
          },
        },
      });
      if (!recipientMember || recipientMember.status !== "ACTIVE") {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Recipient must be an active org member"
        );
      }
    }

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
