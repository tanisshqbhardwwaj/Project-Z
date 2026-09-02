import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { updateShopBranch } from "@/services/shop/shop-branch.service";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  code: z.string().max(6).optional(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const data = patchSchema.parse(body);
    try {
      const branch = await updateShopBranch(ctx.organizationId, id, data);
      return apiSuccess(serializeBigInt(branch));
    } catch {
      throw new ApiError(404, "NOT_FOUND", "Branch not found");
    }
  });
}
