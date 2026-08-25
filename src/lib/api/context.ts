import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { OrgRole } from "@prisma/client";
import { hasPermission, canManageOrg, canAccessProjectsNav, type Permission } from "@/lib/permissions/rbac";
import { subscriptionAllowsProductUse } from "@/lib/billing/entitlements";
import { formatZodError } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { RateLimitError } from "@/lib/rate-limit";
import { clientSafeInternalMessage } from "@/lib/api/internal-error";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export interface AuthContext {
  userId: string;
  userEmail: string;
  userName: string;
  organizationId: string;
  role: OrgRole;
}

export function requireOwner(ctx: AuthContext) {
  if (!canManageOrg(ctx.role)) {
    throw new ApiError(403, "FORBIDDEN", "Owner access required");
  }
}

export async function getAuthContext(
  organizationIdHeader?: string | null,
  options?: { allowCancelled?: boolean }
): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  let organizationId =
    organizationIdHeader ?? session.user.activeOrganizationId ?? null;

  if (!organizationId) {
    const fallbackMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
    });
    organizationId = fallbackMember?.organizationId ?? null;
  }

  if (!organizationId) {
    throw new ApiError(400, "ORG_REQUIRED", "Organization context required");
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionStatus: true },
  });
  if (!org) {
    throw new ApiError(404, "NOT_FOUND", "Organization not found");
  }
  if (!subscriptionAllowsProductUse(org.subscriptionStatus) && !options?.allowCancelled) {
    throw new ApiError(
      403,
      "SUBSCRIPTION_CANCELLED",
      "This shop subscription is cancelled. Go to Settings → Billing or contact support to reactivate."
    );
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
  });

  if (!member || member.status !== "ACTIVE") {
    throw new ApiError(403, "FORBIDDEN", "Not a member of this organization");
  }

  return {
    userId: session.user.id,
    userEmail: session.user.email!,
    userName: session.user.name ?? "",
    organizationId,
    role: member.role,
  };
}

export function requirePermission(ctx: AuthContext, permission: Permission) {
  if (!hasPermission(ctx.role, permission)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
  }
}

export function requireProjectViewAccess(ctx: AuthContext) {
  if (!canAccessProjectsNav(ctx.role)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
  }
}

export function requireProjectWriteAccess(ctx: AuthContext) {
  requireProjectViewAccess(ctx);
  if (ctx.role === "VIEWER") {
    throw new ApiError(403, "FORBIDDEN", "Viewers cannot change project data");
  }
}

export function requireUdhaarWrite(ctx: AuthContext) {
  if (
    hasPermission(ctx.role, "payment.create") ||
    hasPermission(ctx.role, "shop.sales")
  ) {
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to change customer credit");
}

export async function requireProjectAccess(
  ctx: AuthContext,
  projectId: string
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null },
  });
  if (!project) {
    throw new ApiError(404, "NOT_FOUND", "Project not found");
  }

  if (ctx.role === "OWNER" || ctx.role === "ACCOUNTANT") return;

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: ctx.userId } },
  });
  if (!member && ctx.role !== "VIEWER") {
    throw new ApiError(403, "FORBIDDEN", "Not assigned to this project");
  }
  if (ctx.role === "VIEWER" && !member) {
    throw new ApiError(403, "FORBIDDEN", "Not assigned to this project");
  }
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta });
}

export function apiError(error: ApiError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status }
  );
}

export async function handleApi<T>(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (e) {
    if (e instanceof ApiError) return apiError(e);
    if (e instanceof RateLimitError) {
      return apiError(new ApiError(429, "RATE_LIMITED", e.message));
    }
    if (e instanceof ZodError) {
      return apiError(new ApiError(400, "VALIDATION_ERROR", formatZodError(e), e.issues));
    }
    if (e instanceof Error) {
      const msg = e.message;
      if (
        msg.includes("UNIQUE constraint failed") ||
        msg.includes("Unique constraint failed")
      ) {
        const friendly =
          msg.includes("BuilderUnit") && msg.includes("unitNumber")
            ? "This unit number already exists in the project"
            : "A record with this value already exists";
        return apiError(new ApiError(409, "CONFLICT", friendly));
      }
    }
    logger.error("api.unhandled_error", {
      error: e instanceof Error ? e.message : String(e),
      name: e instanceof Error ? e.name : "UnknownError",
    });
    const message = clientSafeInternalMessage(
      e,
      process.env.NODE_ENV === "production"
    );
    return apiError(new ApiError(500, "INTERNAL_ERROR", message));
  }
}
