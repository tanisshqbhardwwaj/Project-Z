import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/context";
import { deriveStoreCode } from "@/lib/shop/bill-number";
import {
  mergeMultiStoreSettings,
  readMultiStoreSettings,
  type CustomerScope,
  type MultiStoreSettings,
} from "@/lib/shop/multi-store";
import { ensureDefaultBranch } from "@/lib/shop/branch-context";
import type { OrgSettingsJson } from "@/lib/org/modules";
import type { Prisma } from "@prisma/client";

export type ShopBranchRow = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeBranchCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "BR";
}

async function allocateUniqueBranchCode(
  tx: Prisma.TransactionClient,
  organizationId: string,
  preferred: string
): Promise<string> {
  const base = normalizeBranchCode(preferred);
  let candidate = base;
  for (let n = 2; n <= 999; n++) {
    const exists = await tx.shopBranch.findFirst({
      where: { organizationId, code: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    const suffix = String(n);
    candidate = `${base.slice(0, Math.max(1, 6 - suffix.length))}${suffix}`.slice(0, 6);
  }
  throw new ApiError(
    409,
    "BRANCH_CODE_EXISTS",
    "Could not generate a unique branch code. Enter a custom code."
  );
}

export async function listShopBranches(organizationId: string): Promise<ShopBranchRow[]> {
  await ensureDefaultBranch(organizationId);
  return prisma.shopBranch.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getMultiStoreConfig(organizationId: string): Promise<{
  settings: MultiStoreSettings;
  branches: ShopBranchRow[];
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, settings: true },
  });
  if (!org) throw new Error("Organization not found");

  const settings = readMultiStoreSettings(org.settings as OrgSettingsJson);
  const branches = await listShopBranches(organizationId);
  return { settings, branches };
}

export async function createShopBranch(input: {
  organizationId: string;
  name: string;
  code?: string;
  address?: string | null;
  phone?: string | null;
  isDefault?: boolean;
}) {
  const trimmedName = input.name.trim();

  return prisma.$transaction(async (tx) => {
    const preferredCode = input.code?.trim()
      ? normalizeBranchCode(input.code)
      : deriveStoreCode(trimmedName);

    const code = input.code?.trim()
      ? await (async () => {
          const normalized = normalizeBranchCode(input.code!);
          const exists = await tx.shopBranch.findFirst({
            where: { organizationId: input.organizationId, code: normalized },
            select: { id: true },
          });
          if (exists) {
            throw new ApiError(
              409,
              "BRANCH_CODE_EXISTS",
              `Branch code "${normalized}" is already in use. Choose a different code.`
            );
          }
          return normalized;
        })()
      : await allocateUniqueBranchCode(tx, input.organizationId, preferredCode);

    if (input.isDefault) {
      await tx.shopBranch.updateMany({
        where: { organizationId: input.organizationId },
        data: { isDefault: false },
      });
    }

    const count = await tx.shopBranch.count({
      where: { organizationId: input.organizationId },
    });

    return tx.shopBranch.create({
      data: {
        organizationId: input.organizationId,
        name: trimmedName,
        code,
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        isDefault: input.isDefault ?? count === 0,
        isActive: true,
      },
    });
  });
}

export async function updateShopBranch(
  organizationId: string,
  branchId: string,
  patch: {
    name?: string;
    code?: string;
    address?: string | null;
    phone?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }
) {
  const branch = await prisma.shopBranch.findFirst({
    where: { id: branchId, organizationId },
  });
  if (!branch) throw new Error("Branch not found");

  return prisma.$transaction(async (tx) => {
    if (patch.isDefault) {
      await tx.shopBranch.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }

    let nextCode: string | undefined;
    if (patch.code != null) {
      const normalized = normalizeBranchCode(patch.code);
      if (normalized !== branch.code) {
        const exists = await tx.shopBranch.findFirst({
          where: { organizationId, code: normalized, NOT: { id: branchId } },
          select: { id: true },
        });
        if (exists) {
          throw new ApiError(
            409,
            "BRANCH_CODE_EXISTS",
            `Branch code "${normalized}" is already in use. Choose a different code.`
          );
        }
        nextCode = normalized;
      }
    }

    return tx.shopBranch.update({
      where: { id: branchId },
      data: {
        ...(patch.name != null ? { name: patch.name.trim() } : {}),
        ...(nextCode != null ? { code: nextCode } : {}),
        ...(patch.address !== undefined ? { address: patch.address?.trim() || null } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone?.trim() || null } : {}),
        ...(patch.isDefault != null ? { isDefault: patch.isDefault } : {}),
        ...(patch.isActive != null ? { isActive: patch.isActive } : {}),
      },
    });
  });
}

export async function updateMultiStoreSettings(
  organizationId: string,
  patch: Partial<MultiStoreSettings>
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organization not found");

  const current = readMultiStoreSettings(org.settings as OrgSettingsJson);
  if (
    patch.customerScope &&
    patch.customerScope !== current.customerScope &&
    current.enabled
  ) {
    const customerCount = await prisma.shopCustomer.count({
      where: { organizationId },
    });
    if (customerCount > 0) {
      throw new Error(
        "Customer scope cannot be changed after customers exist. Contact support if you need to migrate."
      );
    }
  }

  const nextSettings = mergeMultiStoreSettings(org.settings as OrgSettingsJson, patch);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: nextSettings },
  });

  if (patch.enabled) {
    await ensureDefaultBranch(organizationId);
  }

  return readMultiStoreSettings(nextSettings);
}

export async function assignCustomersToBranchOnIsolate(
  organizationId: string,
  branchId: string
) {
  await prisma.shopCustomer.updateMany({
    where: { organizationId, branchId: null },
    data: { branchId },
  });
}

export async function onCustomerScopeChange(
  organizationId: string,
  scope: CustomerScope
) {
  if (scope === "ISOLATED") {
    const defaultBranch = await prisma.shopBranch.findFirst({
      where: { organizationId, isDefault: true, isActive: true },
      select: { id: true },
    });
    if (defaultBranch) {
      await assignCustomersToBranchOnIsolate(organizationId, defaultBranch.id);
    }
  } else {
    await prisma.shopCustomer.updateMany({
      where: { organizationId },
      data: { branchId: null },
    });
  }
}
