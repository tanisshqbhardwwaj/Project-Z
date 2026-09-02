import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { transferStockBetweenBranches } from "@/services/shop/shop-branch-transfer.service";

const transferSchema = z.object({
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");
    await getShopBranchContext(ctx, request.headers.get("X-Branch-Id"));

    const body = await request.json();
    const data = transferSchema.parse(body);

    const result = await transferStockBetweenBranches({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(result));
  });
}
