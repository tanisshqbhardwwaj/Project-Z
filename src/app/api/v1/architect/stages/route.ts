import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createDesignStage,
  createDrawingRevision,
  listDesignStages,
  updateDesignStage,
} from "@/services/architect.service";

const createStageSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  feeRupees: z.number().min(0).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const updateStageSchema = z.object({
  stageId: z.string().uuid(),
  name: z.string().min(1).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "SUBMITTED", "APPROVED"]).optional(),
  feeRupees: z.number().min(0).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const createRevisionSchema = z.object({
  stageId: z.string().uuid(),
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");

    const stages = await listDesignStages(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(stages));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();

    if (body.stageId && body.title) {
      const data = createRevisionSchema.parse(body);
      const revision = await createDrawingRevision({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        ...data,
      });
      return NextResponse.json({ data: serializeBigInt(revision) }, { status: 201 });
    }

    const data = createStageSchema.parse(body);
    const stage = await createDesignStage({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(stage) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = updateStageSchema.parse(body);

    const stage = await updateDesignStage({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(stage));
  });
}
