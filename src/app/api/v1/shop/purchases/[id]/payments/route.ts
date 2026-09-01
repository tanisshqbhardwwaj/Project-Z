import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { canManageShopPurchases, canViewShopPurchases } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { recordPurchasePaymentSchema } from "@/lib/validation/shop-purchase";
import {
  listPurchasePayments,
  recordPurchasePayment,
} from "@/services/shop/shop-purchase.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    if (!canViewShopPurchases(ctx.role)) requireOwner(ctx);
    const payments = await listPurchasePayments(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(payments));
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!canManageShopPurchases(ctx.role)) requireOwner(ctx);
    const body = await request.json();
    const data = recordPurchasePaymentSchema.parse(body);
    const purchase = await recordPurchasePayment({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      purchaseId: id,
      amountRupees: data.amountRupees,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
    return apiSuccess(serializeBigInt(purchase));
  });
}
