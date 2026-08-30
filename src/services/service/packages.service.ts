import type { PackageStatus, ServicePackageType } from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import {
  createServicePackage as createPackage,
  deactivateServicePackage,
  getServicePackage,
  listServicePackages as listPackages,
  sellServicePackage,
  updateServicePackage as updatePackage,
} from "./service-package.service";

export {
  getServicePackage,
  sellServicePackage,
};

export async function listServicePackages(input: {
  organizationId: string;
  activeOnly?: boolean;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const rows = await listPackages(input.organizationId, {
    activeOnly: input.activeOnly,
  });
  const startIdx = input.cursor
    ? Math.max(0, rows.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  return toCursorPage(rows.slice(startIdx, startIdx + limit + 1), limit);
}

export async function createServicePackage(input: {
  organizationId: string;
  userId: string;
  name: string;
  type: ServicePackageType;
  priceRupees: number;
  sessionCount?: number | null;
  prepaidValueRupees?: number | null;
  validityDays?: number | null;
  includedServiceIds?: string[];
  isActive?: boolean;
}) {
  return createPackage({
    organizationId: input.organizationId,
    createdById: input.userId,
    name: input.name,
    type: input.type,
    priceRupees: input.priceRupees,
    sessionCount: input.sessionCount,
    prepaidValueRupees: input.prepaidValueRupees,
    validityDays: input.validityDays,
    includedServiceIds: input.includedServiceIds,
    isActive: input.isActive,
  });
}

export async function updateServicePackage(input: {
  organizationId: string;
  userId: string;
  packageId: string;
  name?: string;
  type?: ServicePackageType;
  priceRupees?: number;
  sessionCount?: number | null;
  prepaidValueRupees?: number | null;
  validityDays?: number | null;
  includedServiceIds?: string[];
  isActive?: boolean;
}) {
  return updatePackage({
    organizationId: input.organizationId,
    packageId: input.packageId,
    userId: input.userId,
    name: input.name,
    type: input.type,
    priceRupees: input.priceRupees,
    sessionCount: input.sessionCount,
    prepaidValueRupees: input.prepaidValueRupees,
    validityDays: input.validityDays,
    includedServiceIds: input.includedServiceIds,
    isActive: input.isActive,
  });
}

export async function deleteServicePackage(
  organizationId: string,
  userId: string,
  packageId: string
) {
  return deactivateServicePackage({
    organizationId,
    packageId,
    userId,
  });
}
