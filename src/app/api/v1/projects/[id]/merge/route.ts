import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requireProjectAccess, requireProjectWriteAccess, apiSuccess } from "@/lib/api/context";
import { mergeProjects } from "@/services/project.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({ sourceProjectId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id: targetProjectId } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireProjectWriteAccess(ctx);

    const body = await request.json();
    const { sourceProjectId } = schema.parse(body);

    await requireProjectAccess(ctx, targetProjectId);
    await requireProjectAccess(ctx, sourceProjectId);

    const project = await mergeProjects({
      targetProjectId,
      sourceProjectId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });

    return apiSuccess(serializeBigInt(project));
  });
}
