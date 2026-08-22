import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createShopSale, listShopSales } from "@/services/shop.service";

const createSaleSchema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerGstin: z.string().optional().nullable(),
  salesBoyName: z.string().optional().nullable(),
  billNumber: z.string().optional().nullable(),
  issueInvoice: z.boolean().optional(),
  totalRupees: z.number().positive(),
  gstRupees: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().positive(),
        priceRupees: z.number().min(0),
        inventoryItemId: z.string().uuid().optional(),
        barcode: z.string().optional(),
      })
    )
    .min(1),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const sales = await listShopSales(ctx.organizationId);
    return apiSuccess(serializeBigInt(sales));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");

    const body = await request.json();
    const data = createSaleSchema.parse(body);

    const sale = await createShopSale({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerGstin: data.customerGstin,
      salesBoyName: data.salesBoyName,
      billNumber: data.billNumber,
      issueInvoice: data.issueInvoice,
      totalRupees: data.totalRupees,
      gstRupees: data.gstRupees,
      paymentMethod: data.paymentMethod,
      items: data.items,
      notes: data.notes,
    });

    return NextResponse.json({ data: serializeBigInt(sale) }, { status: 201 });
  });
}
