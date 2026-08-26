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
  createBoqItem,
  listBoqItems,
  updateBoqItem,
} from "@/services/contractor.service";
<<<<<<< HEAD
import {
  requireAssignedBoqWrite,
  requireAssignedProjectView,
  requireAssignedProjectWrite,
} from "@/lib/org/project-api-access";
=======
>>>>>>> origin/master

const createBoqSchema = z.object({
  projectId: z.string().uuid(),
  itemCode: z.string().optional().nullable(),
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  rateRupees: z.number().min(0),
});

const updateBoqSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  rateRupees: z.number().min(0).optional(),
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

    const items = await listBoqItems(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(items));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
    const body = await request.json();
    const data = createBoqSchema.parse(body);
    await requireAssignedProjectWrite(ctx, data.projectId);
=======
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = createBoqSchema.parse(body);
>>>>>>> origin/master

    const item = await createBoqItem({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(item) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
    const body = await request.json();
    const data = updateBoqSchema.parse(body);
    await requireAssignedBoqWrite(ctx, data.itemId);
=======
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = updateBoqSchema.parse(body);
>>>>>>> origin/master

    const item = await updateBoqItem({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(item));
  });
}
