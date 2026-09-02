import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { BusinessType, OrgRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { resolveAuthenticatedUserId } from "@/lib/auth/resolve-session";
import { hasPermission, canManageOrg, canAccessProjectsNav, type Permission } from "@/lib/permissions/rbac";
import { subscriptionAllowsProductUse } from "@/lib/billing/entitlements";
import { formatZodError } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { RateLimitError } from "@/lib/rate-limit";
import { clientSafeInternalMessage } from "@/lib/api/internal-error";
import {
  ErrorCodes,
  resolveUserError,
  isKnownBusinessError,
  httpStatusForThrownMessage,
} from "@/lib/errors";
import { touchOrganizationActivity } from "@/lib/db/touch-org-activity";
import { ensureOrgBillingSchema } from "@/lib/db/ensure-org-billing-schema";
import { readActiveOrgCookie } from "@/lib/org/active-org-cookie";
import {
  getCachedOrganization,
  invalidateCachedOrganization,
  runWithRequestCache,
} from "@/lib/db/request-cache";
import {
  queryMetricsHeaders,
  runWithQueryMetrics,
} from "@/lib/db/query-metrics";

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
  businessType: BusinessType;
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
  const headerStore = await headers();
  const userId = await resolveAuthenticatedUserId(headerStore.get("authorization"));
  if (!userId) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const headerId = organizationIdHeader || null;
  const cookieId = await readActiveOrgCookie();
  const session = await auth();
  const sessionId = session?.user?.activeOrganizationId ?? null;

  let organizationId = headerId;
  if (!organizationId && cookieId) {
    const cookieMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: cookieId,
          userId,
        },
      },
      select: { status: true },
    });
    if (cookieMember?.status === "ACTIVE") {
      organizationId = cookieId;
    }
  }
  if (!organizationId) organizationId = sessionId;

  if (!organizationId) {
    const fallbackMember = await prisma.organizationMember.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
    });
    organizationId = fallbackMember?.organizationId ?? null;
  }

  if (!organizationId) {
    throw new ApiError(400, "ORG_REQUIRED", "Organization context required");
  }

  await ensureOrgBillingSchema();

  let org = await getCachedOrganization(organizationId);
  if (!org) {
    throw new ApiError(404, "NOT_FOUND", "Organization not found");
  }

  const now = new Date();
  if (org.accessExpiresAt && org.accessExpiresAt < now) {
    throw new ApiError(
      403,
      "SUBSCRIPTION_EXPIRED",
      "Your organization's access has expired. Contact support to renew."
    );
  }

  if (
    org.subscriptionStatus === "TRIAL" &&
    org.currentPeriodEnd &&
    org.currentPeriodEnd < now
  ) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: "PAST_DUE" },
    });
    invalidateCachedOrganization(organizationId);
    throw new ApiError(
      403,
      "SUBSCRIPTION_EXPIRED",
      "Your trial has ended. Go to Settings â†’ Billing or contact support to continue."
    );
  }

  if (!subscriptionAllowsProductUse(org.subscriptionStatus) && !options?.allowCancelled) {
    throw new ApiError(
      403,
      "SUBSCRIPTION_CANCELLED",
      "This shop subscription is cancelled. Go to Settings â†’ Billing or contact support to reactivate."
    );
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!member || member.status !== "ACTIVE") {
    throw new ApiError(403, "FORBIDDEN", "Not a member of this organization");
  }

  void touchOrganizationActivity(organizationId);

  return {
    userId,
    userEmail: member.user.email,
    userName: member.user.name ?? "",
    organizationId,
    role: member.role,
    businessType: org.businessType,
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

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  extraHeaders?: Record<string, string>
) {
  const headers = { ...queryMetricsHeaders(), ...extraHeaders };
  return NextResponse.json(
    { data, meta },
    Object.keys(headers).length ? { headers } : undefined
  );
}

export function apiError(error: ApiError) {
  const message = resolveUserError({
    code: error.code,
    message: error.message,
    details: error.details,
  });
  return NextResponse.json(
    { error: { code: error.code, message, details: error.details } },
    { status: error.status }
  );
}

export async function handleApi(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await runWithRequestCache(() =>
      runWithQueryMetrics(async () => {
        const response = await handler();
        const metrics = queryMetricsHeaders();
        if (Object.keys(metrics).length === 0) return response;
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(metrics)) {
          headers.set(key, value);
        }
        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
    );
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
      if (isKnownBusinessError(msg)) {
        return apiError(
          new ApiError(
            httpStatusForThrownMessage(msg),
            ErrorCodes.BUSINESS_RULE,
            resolveUserError({ message: msg })
          )
        );
      }
      if (
        msg.includes("UNIQUE constraint failed") ||
        msg.includes("Unique constraint failed")
      ) {
        const friendly = resolveUserError({ code: ErrorCodes.CONFLICT });
        return apiError(new ApiError(409, ErrorCodes.CONFLICT, friendly));
      }
    }
    logger.error("api.unhandled_error", {
      error: e instanceof Error ? e.message : String(e),
      name: e instanceof Error ? e.name : "UnknownError",
    });
    const message = resolveUserError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: clientSafeInternalMessage(e, process.env.NODE_ENV === "production"),
    });
    return apiError(new ApiError(500, ErrorCodes.INTERNAL_ERROR, message));
  }
}
