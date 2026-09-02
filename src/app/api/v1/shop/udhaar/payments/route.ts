import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireUdhaarWrite,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { recordCustomerPayment } from "@/services/shop/shop-credit.service";

const paymentSchema = z.object({
  creditId: z.string().uuid(),
  amountRupees: z.number().positive(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]).optional(),
  notes: z.string().optional().nullable(),
  shopSaleId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireUdhaarWrite(ctx);
    const data = paymentSchema.parse(await request.json());
    const credit = await recordCustomerPayment({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });
    return NextResponse.json({ data: serializeBigInt(credit) }, { status: 201 });
  });
}
