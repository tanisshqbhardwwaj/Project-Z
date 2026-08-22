import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { previewOffersForCart } from "@/services/shop-offer.service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const body = await request.json();
    const result = await previewOffersForCart(ctx.organizationId, body.items ?? [], {
      selectedOfferId: body.selectedOfferId ?? null,
      skipOffer: body.skipOffer === true,
    });
    return apiSuccess(result);
  });
}
