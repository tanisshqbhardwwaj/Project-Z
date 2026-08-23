import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
  requireOwner,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createPlanRequest } from "@/services/billing.service";

const requestSchema = z.object({
  plan: z.enum(["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"]),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = requestSchema.parse(await request.json());
    const req = await createPlanRequest({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      toPlan: body.plan,
    });
    return apiSuccess(serializeBigInt(req));
  });
}
