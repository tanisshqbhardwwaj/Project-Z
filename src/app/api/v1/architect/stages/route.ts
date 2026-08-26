import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
<<<<<<< HEAD
=======
  requirePermission,
>>>>>>> origin/master
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createDesignStage,
  createDrawingRevision,
  listDesignStages,
  updateDesignStage,
} from "@/services/architect.service";
<<<<<<< HEAD
import {
  requireAssignedProjectView,
  requireAssignedProjectWrite,
  requireAssignedStageWrite,
} from "@/lib/org/project-api-access";
=======
>>>>>>> origin/master

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
<<<<<<< HEAD
    const projectId = await requireAssignedProjectView(
      ctx,
      new URL(request.url).searchParams.get("projectId")
    );
=======
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");
>>>>>>> origin/master

    const stages = await listDesignStages(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(stages));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
=======
    requirePermission(ctx, "project.view_all");

>>>>>>> origin/master
    const body = await request.json();

    if (body.stageId && body.title) {
      const data = createRevisionSchema.parse(body);
<<<<<<< HEAD
      await requireAssignedStageWrite(ctx, data.stageId);
=======
>>>>>>> origin/master
      const revision = await createDrawingRevision({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        ...data,
      });
      return NextResponse.json({ data: serializeBigInt(revision) }, { status: 201 });
    }

    const data = createStageSchema.parse(body);
<<<<<<< HEAD
    await requireAssignedProjectWrite(ctx, data.projectId);
=======
>>>>>>> origin/master
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
<<<<<<< HEAD
    const body = await request.json();
    const data = updateStageSchema.parse(body);
    await requireAssignedStageWrite(ctx, data.stageId);
=======
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = updateStageSchema.parse(body);
>>>>>>> origin/master

    const stage = await updateDesignStage({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(stage));
  });
}
