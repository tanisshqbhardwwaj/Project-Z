import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createShopBranch,
  getMultiStoreConfig,
  listShopBranches,
} from "@/services/shop/shop-branch.service";

const createBranchSchema = z.object({
  name: z.string().min(1).max(80),
  code: z.string().max(6).optional(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { searchParams } = new URL(request.url);
    if (searchParams.get("config") === "1") {
      const config = await getMultiStoreConfig(ctx.organizationId);
      return apiSuccess(serializeBigInt(config));
    }
    const branches = await listShopBranches(ctx.organizationId);
    return apiSuccess(serializeBigInt({ branches }));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const data = createBranchSchema.parse(body);
    const branch = await createShopBranch({
      organizationId: ctx.organizationId,
      name: data.name,
      code: data.code,
      address: data.address,
      phone: data.phone,
      isDefault: data.isDefault,
    });
    return apiSuccess(serializeBigInt(branch));
  });
}
