import type { PackageStatus } from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import {
  listCustomerPackages as listPackages,
  redeemCustomerPackage,
} from "./service-package.service";

export { redeemCustomerPackage };

export async function listCustomerPackages(input: {
  organizationId: string;
  customerId?: string;
  packageId?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const rows = await listPackages({
    organizationId: input.organizationId,
    customerId: input.customerId,
    status: input.status as PackageStatus | undefined,
  });

  const filtered = input.packageId
    ? rows.filter((row) => row.packageId === input.packageId)
    : rows;

  const startIdx = input.cursor
    ? Math.max(0, filtered.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  return toCursorPage(filtered.slice(startIdx, startIdx + limit + 1), limit);
}
