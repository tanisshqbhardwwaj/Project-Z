import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { previewOffersForCart } from "@/services/shop/shop-offer.service";
import { requireShopBilling } from "@/lib/staff/shop-access";

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);
    const body = await request.json();
    const result = await previewOffersForCart(ctx.organizationId, body.items ?? [], {
      selectedOfferId: body.selectedOfferId ?? null,
      skipOffer: body.skipOffer === true,
    });
    return apiSuccess(result);
  });
}
