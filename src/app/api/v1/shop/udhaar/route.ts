import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
<<<<<<< HEAD
  requireUdhaarWrite,
=======
>>>>>>> origin/master
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  adjustCustomerCredit,
  createCustomerCredit,
  listCustomerCredits,
} from "@/services/shop.service";

const createCreditSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().optional().nullable(),
  balanceRupees: z.number().optional(),
  notes: z.string().optional().nullable(),
});

const adjustCreditSchema = z.object({
  creditId: z.string().uuid(),
  deltaRupees: z.number(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "financial.view");
    const credits = await listCustomerCredits(ctx.organizationId);
    return apiSuccess(serializeBigInt(credits));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
    requireUdhaarWrite(ctx);
=======
    requirePermission(ctx, "financial.view");
>>>>>>> origin/master

    const body = await request.json();
    const data = createCreditSchema.parse(body);

    const credit = await createCustomerCredit({
      organizationId: ctx.organizationId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(credit) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
    requireUdhaarWrite(ctx);
=======
    requirePermission(ctx, "financial.view");
>>>>>>> origin/master

    const body = await request.json();
    const data = adjustCreditSchema.parse(body);

    const credit = await adjustCustomerCredit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(credit));
  });
}
