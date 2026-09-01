import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopSale } from "@/services/shop.service";
import { assertSaleReadAccess } from "@/lib/staff/shop-access";
import {
  redactSaleCustomerFields,
  shouldRedactSaleCustomerDetails,
} from "@/lib/staff/sale-privacy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));

    const { id } = await context.params;
    const sale = await getShopSale(ctx.organizationId, id);
    await assertSaleReadAccess(ctx, sale.staffId);
    const payload = shouldRedactSaleCustomerDetails(ctx)
      ? redactSaleCustomerFields(sale)
      : sale;
    return apiSuccess(serializeBigInt(payload));
  });
}
