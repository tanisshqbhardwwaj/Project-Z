import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { updateMultiStoreSettings } from "@/services/shop-branch.service";

const schema = z.object({
  enabled: z.boolean().optional(),
  customerScope: z.enum(["SHARED", "ISOLATED"]).optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { getMultiStoreConfig } = await import("@/services/shop-branch.service");
    const config = await getMultiStoreConfig(ctx.organizationId);
    return apiSuccess(serializeBigInt(config));
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const data = schema.parse(body);
    const settings = await updateMultiStoreSettings(ctx.organizationId, data);
    return apiSuccess(settings);
  });
}
