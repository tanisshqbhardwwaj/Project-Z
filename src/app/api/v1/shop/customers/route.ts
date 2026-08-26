import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { listShopCustomers, searchShopCustomers } from "@/services/shop.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const listAll = searchParams.get("all") === "1";
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? 25);

    const customers = listAll
      ? await listShopCustomers(ctx.organizationId, limit, cursor)
      : await searchShopCustomers(ctx.organizationId, q, limit, cursor);

    return apiSuccess(serializeBigInt(customers));
  });
}
