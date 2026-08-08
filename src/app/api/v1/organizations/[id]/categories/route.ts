import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id") ?? id);

    const categories = await prisma.expenseCategory.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
    });

    return apiSuccess(serializeBigInt(categories));
  });
}
