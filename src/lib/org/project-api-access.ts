import { prisma } from "@/lib/db/prisma";
import {
  ApiError,
  type AuthContext,
  requireProjectAccess,
  requireProjectViewAccess,
  requireProjectWriteAccess,
} from "@/lib/api/context";

export async function requireAssignedProjectView(
  ctx: AuthContext,
  projectId: string | null | undefined
): Promise<string> {
  requireProjectViewAccess(ctx);
  if (!projectId) {
    throw new ApiError(400, "VALIDATION_ERROR", "projectId is required");
  }
  await requireProjectAccess(ctx, projectId);
  return projectId;
}

export async function requireAssignedProjectWrite(
  ctx: AuthContext,
  projectId: string | null | undefined
): Promise<string> {
  requireProjectWriteAccess(ctx);
  if (!projectId) {
    throw new ApiError(400, "VALIDATION_ERROR", "projectId is required");
  }
  await requireProjectAccess(ctx, projectId);
  return projectId;
}

export async function requireAssignedBoqWrite(ctx: AuthContext, itemId: string) {
  requireProjectWriteAccess(ctx);
  const row = await prisma.boqItem.findFirst({
    where: { id: itemId, organizationId: ctx.organizationId },
    select: { projectId: true },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "BOQ item not found");
  await requireProjectAccess(ctx, row.projectId);
}

export async function requireAssignedStageWrite(ctx: AuthContext, stageId: string) {
  requireProjectWriteAccess(ctx);
  const row = await prisma.designStage.findFirst({
    where: { id: stageId, organizationId: ctx.organizationId },
    select: { projectId: true },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Design stage not found");
  await requireProjectAccess(ctx, row.projectId);
}

export async function requireAssignedUnitWrite(ctx: AuthContext, unitId: string) {
  requireProjectWriteAccess(ctx);
  const row = await prisma.builderUnit.findFirst({
    where: { id: unitId, organizationId: ctx.organizationId },
    select: { projectId: true },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Unit not found");
  await requireProjectAccess(ctx, row.projectId);
}

export async function requireAssignedBookingWrite(
  ctx: AuthContext,
  bookingId: string
) {
  requireProjectWriteAccess(ctx);
  const row = await prisma.unitBooking.findFirst({
    where: { id: bookingId, organizationId: ctx.organizationId },
    select: { projectId: true },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Booking not found");
  await requireProjectAccess(ctx, row.projectId);
}
