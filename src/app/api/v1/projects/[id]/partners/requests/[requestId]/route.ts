import {
  getAuthContext,
  handleApi,
  requireProjectAccess,
  apiSuccess,
} from "@/lib/api/context";
import { approvePartnerRequest, rejectPartnerRequest } from "@/services/projects/project.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  return handleApi(async () => {
    const { id, requestId } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const { action } = actionSchema.parse(await request.json());

    if (action === "approve") {
      const member = await approvePartnerRequest({
        requestId,
        projectId: id,
        organizationId: ctx.organizationId,
        reviewerId: ctx.userId,
      });
      return apiSuccess(serializeBigInt(member));
    }

    const result = await rejectPartnerRequest({
      requestId,
      projectId: id,
      organizationId: ctx.organizationId,
      reviewerId: ctx.userId,
    });
    return apiSuccess(result);
  });
}
