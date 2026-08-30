import { prisma } from "@/lib/db/prisma";
import { ApiError, type AuthContext } from "@/lib/api/context";
import { readMultiStoreSettings } from "@/lib/shop/multi-store";
import { ensureShopBranchSchema } from "@/lib/shop/ensure-shop-branch-schema";
import { deriveStoreCode } from "@/lib/shop/bill-number";
import { getCachedOrganization } from "@/lib/db/request-cache";

/** Sentinel for aggregated all-branch queries */
export const BRANCH_ALL = "all" as const;

export type BranchScope = string | typeof BRANCH_ALL;

export type BranchContext = AuthContext & {
  branchId: BranchScope;
  customerScope: "SHARED" | "ISOLATED";
  multiStoreEnabled: boolean;
};

export function isBranchAll(scope: BranchScope | null | undefined): scope is typeof BRANCH_ALL {
  return scope === BRANCH_ALL;
}

/** Prisma where fragment for optional branch filter */
export function branchWhere(scope: BranchScope): { branchId?: string } {
  if (isBranchAll(scope)) return {};
  return { branchId: scope };
}

export async function resolveBranchId(
  organizationId: string,
  branchIdHeader?: string | null
): Promise<BranchScope> {
  await ensureShopBranchSchema(organizationId);

  if (branchIdHeader === BRANCH_ALL) {
    return BRANCH_ALL;
  }

  if (branchIdHeader) {
    const branch = await prisma.shopBranch.findFirst({
      where: {
        id: branchIdHeader,
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!branch) {
      throw new ApiError(400, "INVALID_BRANCH", "Branch not found or inactive");
    }
    return branch.id;
  }

  const defaultBranch = await prisma.shopBranch.findFirst({
    where: { organizationId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!defaultBranch) {
    throw new ApiError(
      400,
      "BRANCH_REQUIRED",
      "No shop branch configured. Add a branch in Settings."
    );
  }

  return defaultBranch.id;
}

export async function getShopBranchContext(
  ctx: AuthContext,
  branchIdHeader?: string | null
): Promise<BranchContext> {
  const org = await getCachedOrganization(ctx.organizationId);
  const multiStore = readMultiStoreSettings(
    (org?.settings ?? {}) as import("@/lib/org/modules").OrgSettingsJson
  );
  const branchId = await resolveBranchId(ctx.organizationId, branchIdHeader);

  return {
    ...ctx,
    branchId,
    customerScope: multiStore.customerScope,
    multiStoreEnabled: multiStore.enabled,
  };
}

export async function ensureDefaultBranch(organizationId: string, orgName?: string) {
  const existing = await prisma.shopBranch.findFirst({
    where: { organizationId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const code = deriveStoreCode(orgName ?? "Main");

  const branch = await prisma.shopBranch.create({
    data: {
      organizationId,
      name: "Main store",
      code,
      isDefault: true,
      isActive: true,
    },
  });
  return branch.id;
}
