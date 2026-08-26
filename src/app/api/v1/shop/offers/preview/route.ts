import {
  getAuthContext,
  handleApi,
<<<<<<< HEAD
  apiSuccess,
} from "@/lib/api/context";
import { previewOffersForCart } from "@/services/shop-offer.service";
import { requireShopBilling } from "@/lib/staff/shop-access";
=======
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { previewOffersForCart } from "@/services/shop-offer.service";
>>>>>>> origin/master

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
    await requireShopBilling(ctx);
=======
    requirePermission(ctx, "shop.sales");
>>>>>>> origin/master
    const body = await request.json();
    const result = await previewOffersForCart(ctx.organizationId, body.items ?? [], {
      selectedOfferId: body.selectedOfferId ?? null,
      skipOffer: body.skipOffer === true,
    });
    return apiSuccess(result);
  });
}
