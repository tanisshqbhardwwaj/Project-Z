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
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerGstin: z.string().optional().nullable(),
  salesBoyName: z.string().optional().nullable(),
  billNumber: z.string().optional().nullable(),
  issueInvoice: z.boolean().optional(),
  totalRupees: z.number().positive().optional(),
  gstRupees: z.number().min(0).optional(),
  discountRupees: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  roundOffRupees: z.number().optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  taxIncluded: z.boolean().optional(),
  manualGstRupees: z.number().min(0).optional().nullable(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "CREDIT", "OTHER"]).optional(),
  paidRupees: z.number().min(0).optional(),
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
  selectedOfferId: z.string().uuid().optional().nullable(),
  skipOffer: z.boolean().optional(),
  appliedOffers: z
    .array(
      z.object({
        offerId: z.string().uuid(),
        name: z.string(),
        discountRupees: z.number().min(0),
      })
    )
    .optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const sales = await listShopSales(ctx.organizationId, { q, customerId });
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
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerGstin: data.customerGstin,
      salesBoyName: data.salesBoyName,
      billNumber: data.billNumber,
      issueInvoice: data.issueInvoice,
      totalRupees: data.totalRupees,
      gstRupees: data.gstRupees,
      discountRupees: data.discountRupees,
      discountPercent: data.discountPercent,
      roundOffRupees: data.roundOffRupees,
      taxRatePercent: data.taxRatePercent,
      taxIncluded: data.taxIncluded,
      manualGstRupees: data.manualGstRupees,
      paymentMethod: data.paymentMethod,
      paidRupees: data.paidRupees,
      items: data.items,
      notes: data.notes,
      selectedOfferId: data.selectedOfferId,
      skipOffer: data.skipOffer,
      appliedOffers: data.appliedOffers,
    });

    return NextResponse.json({ data: serializeBigInt(sale) }, { status: 201 });
  });
}
