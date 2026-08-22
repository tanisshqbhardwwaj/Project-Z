import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { deleteOrganization } from "@/services/organization.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const { id: organizationId } = await context.params;
    const result = await deleteOrganization({
      organizationId,
      userId: session.user.id,
    });

    return NextResponse.json({ data: result });
  });
}
