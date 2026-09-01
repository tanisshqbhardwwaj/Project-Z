import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { deleteOffer, updateOffer } from "@/services/shop/shop-offer.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const row = await updateOffer({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      offerId: id,
      name: body.name,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue != null ? Number(body.discountValue) : undefined,
      productIds: body.productIds,
      categoryKeys: body.categoryKeys,
      minQuantity: body.minQuantity,
      minPurchaseRupees: body.minPurchaseRupees,
      buyQuantity: body.buyQuantity,
      getQuantity: body.getQuantity,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isActive: body.isActive,
      priority: body.priority,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const row = await deleteOffer(ctx.organizationId, ctx.userId, id);
    return apiSuccess(serializeBigInt(row));
  });
}
