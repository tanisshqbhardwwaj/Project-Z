import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createShopSale, listShopSales } from "@/services/shop/shop.service";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { customerBranchIdForCreate } from "@/lib/shop/branch/multi-store";
import {
  shopCustomerGstinSchema,
  shopCustomerNameSchema,
  phoneOptionalSchema,
} from "@/lib/validation/fields";
import {
  ownSalesStaffScope,
  requireShopBilling,
} from "@/lib/staff/shop-access";
import {
  redactSaleCustomerFields,
  shouldRedactSaleCustomerDetails,
} from "@/lib/staff/sale-privacy";

const createSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  customerName: shopCustomerNameSchema,
  customerPhone: phoneOptionalSchema,
  customerGstin: shopCustomerGstinSchema,
  /** Links the bill to a staff record so sales commission can be computed. */
  staffId: z.string().uuid().optional().nullable(),
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
        productId: z.string().uuid().optional(),
        barcode: z.string().optional(),
        sku: z.string().max(64).optional(),
        size: z.string().max(40).optional(),
        color: z.string().max(40).optional(),
        variantLabel: z.string().max(80).optional(),
        unit: z.string().max(20).optional(),
        staffId: z.string().uuid().optional(),
        itemKind: z.enum(["PRODUCT", "SERVICE", "MENU_ITEM"]).optional(),
      })
    )
    .min(1),
  notes: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
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
  splitPayments: z
    .array(
      z.object({
        method: z.enum(["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"]),
        amountRupees: z.number().positive(),
      })
    )
    .min(2)
    .optional(),
  terminalPayment: z
    .object({
      provider: z.string(),
      externalId: z.string(),
      merchantTxnId: z.string(),
      reference: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const staffScope = await ownSalesStaffScope(ctx);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const redactCustomers = shouldRedactSaleCustomerDetails(ctx);
    const customerId = redactCustomers
      ? undefined
      : searchParams.get("customerId") ?? undefined;
    const sales = await listShopSales(ctx.organizationId, {
      q: q ?? "",
      customerId,
      billNumberOnly: redactCustomers,
      branchId: shopCtx.branchId,
      staffId: staffScope,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    const items = redactCustomers
      ? sales.items.map((row) => redactSaleCustomerFields(row))
      : sales.items;
    return apiSuccess(serializeBigInt({ ...sales, items }));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );

    const body = await request.json();
    const data = createSaleSchema.parse(body);

    const sale = await createShopSale({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      customerBranchId: customerBranchIdForCreate(
        shopCtx.customerScope,
        shopCtx.branchId
      ),
      createdById: ctx.userId,
      clientId: data.clientId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerGstin: data.customerGstin,
      staffId: data.staffId,
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
      splitPayments: data.splitPayments,
      terminalPayment: data.terminalPayment,
    });

    return NextResponse.json({ data: serializeBigInt(sale) }, { status: 201 });
  });
}
