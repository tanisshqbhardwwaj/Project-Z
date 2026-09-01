import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireProjectAccess,
  apiSuccess,
} from "@/lib/api/context";import { serializeBigInt } from "@/lib/db/prisma";
import {
  createProjectInvoice,
  listProjectInvoices,
} from "@/services/projects/project-invoice.service";

const createInvoiceSchema = z.object({
  clientName: z.string().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  clientGstin: z.string().optional().nullable(),
  paymentMethod: z
    .enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "CREDIT", "OTHER"])
    .optional(),
  discountRupees: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountBasis: z.enum(["subtotal", "total"]).optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  taxIncluded: z.boolean().optional(),
  manualGstRupees: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().positive(),
        priceRupees: z.number().min(0),
        unit: z.string().max(20).optional(),
      })
    )
    .min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const { searchParams } = new URL(request.url);
    const result = await listProjectInvoices(id, ctx.organizationId, {
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(result));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const body = await request.json();
    const data = createInvoiceSchema.parse(body);

    const invoice = await createProjectInvoice({
      organizationId: ctx.organizationId,
      projectId: id,
      createdById: ctx.userId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientGstin: data.clientGstin,
      paymentMethod: data.paymentMethod,
      items: data.items,
      notes: data.notes,
      discountRupees: data.discountRupees,
      discountPercent: data.discountPercent,
      discountBasis: data.discountBasis,
      taxRatePercent: data.taxRatePercent,
      taxIncluded: data.taxIncluded,
      manualGstRupees: data.manualGstRupees,
    });

    return NextResponse.json({ data: serializeBigInt(invoice) }, { status: 201 });
  });
}
