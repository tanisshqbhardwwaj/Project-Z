import { auth } from "@/lib/auth";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  buildOrgSwitchContext,
  resolveRedirectAfterSwitch,
} from "@/services/org/org-switch.service";
import { z } from "zod";

const schema = z.object({
  organizationId: z.string().uuid(),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const body = await request.json();
    const { organizationId, returnTo } = schema.parse(body);

    const organization = await buildOrgSwitchContext(session.user.id, organizationId);
    if (!organization) {
      throw new ApiError(403, "FORBIDDEN", "Not a member of this organization");
    }

    const redirectTo = resolveRedirectAfterSwitch(organization.businessType, returnTo);

    return apiSuccess(
      serializeBigInt({
        activeOrganizationId: organizationId,
        organization,
        redirectTo,
      })
    );
  });
}
