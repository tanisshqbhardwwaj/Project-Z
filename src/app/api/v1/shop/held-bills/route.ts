import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  cancelHeldBill,
  createHeldBill,
  listActiveHeldBills,
  resumeHeldBill,
} from "@/services/shop-held-bill.service";
import { requireShopBilling } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);
    const rows = await listActiveHeldBills(ctx.organizationId);
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);
    const body = await request.json();
    const row = await createHeldBill({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerGstin: body.customerGstin,
      salesBoyName: body.salesBoyName,
      cartJson: body.cartJson,
      pricingJson: body.pricingJson,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);
    const body = await request.json();
    if (body.action === "resume") {
      const row = await resumeHeldBill({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        heldBillId: body.heldBillId,
      });
      return apiSuccess(serializeBigInt(row));
    }
    if (body.action === "cancel") {
      const row = await cancelHeldBill({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        heldBillId: body.heldBillId,
      });
      return apiSuccess(serializeBigInt(row));
    }
    throw new Error("Invalid action");
  });
}
