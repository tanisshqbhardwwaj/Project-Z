import { z } from "zod";
import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { applySyncPush } from "@/services/shop/shop-sync.service";

const itemSchema = z.object({
  id: z.string().uuid(),
  kind: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()),
});

const bodySchema = z.object({
  deviceId: z.string().uuid().optional().nullable(),
  items: z.array(itemSchema).min(1).max(80),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const body = bodySchema.parse(await request.json());
    const results = await applySyncPush({
      ctx,
      deviceId: body.deviceId,
      items: body.items,
    });
    return apiSuccess({ results });
  });
}
