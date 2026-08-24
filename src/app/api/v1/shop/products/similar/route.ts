import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { findSimilarProducts } from "@/services/shop-product.service";

/**
 * Backs the "a similar product already exists — continue?" prompt. Duplicate
 * names are allowed on purpose (different supplier, batch, cost), so this only
 * warns; it never blocks.
 */
export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") ?? "";
    if (name.trim().length < 2) return apiSuccess([]);

    const matches = await findSimilarProducts({
      organizationId: ctx.organizationId,
      name,
      brand: searchParams.get("brand"),
      limit: 5,
    });
    return apiSuccess(serializeBigInt(matches));
  });
}
