import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireProjectAccess,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import {
  getProjectSummary,
  hardDeleteProject,
  updateProjectDetails,
} from "@/services/project.service";
import { serializeBigInt } from "@/lib/db/prisma";

const hardDeleteSchema = z.object({
  hard: z.literal(true),
  confirmName: z.string().min(1, { error: "Please type the work order name to confirm" }),
});

const patchSchema = z.object({
  nickname: z.string().max(40).nullable().optional(),
  name: z.string().min(1).max(500).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const result = await getProjectSummary(id, ctx.organizationId);
    if (!result) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    return apiSuccess(serializeBigInt(result));
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const body = await request.json();
    const data = patchSchema.parse(body);

    if (data.nickname === undefined && data.name === undefined) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nothing to update");
    }

    const project = await updateProjectDetails({
      projectId: id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      nickname: data.nickname,
      name: data.name,
    });

    return apiSuccess(serializeBigInt(project));
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const body = await request.json().catch(() => ({}));
    const parsed = hardDeleteSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        400,
        "CONFIRMATION_REQUIRED",
        "Permanent deletion requires confirmation. Type the exact work order name."
      );
    }

    const result = await hardDeleteProject({
      projectId: id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      confirmName: parsed.data.confirmName,
    });

    return apiSuccess(result);
  });
}
