import "server-only";

import { AsyncLocalStorage } from "async_hooks";
import type { Organization } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Fields commonly read across auth, modules, billing, and branch context in one request. */
export const ORG_CONTEXT_SELECT = {
  id: true,
  name: true,
  businessType: true,
  shopSector: true,
  enableStaff: true,
  timezone: true,
  settings: true,
  plan: true,
  subscriptionStatus: true,
  accessExpiresAt: true,
  currentPeriodEnd: true,
  storageQuotaBytes: true,
  storageUsedBytes: true,
} as const;

export type OrgContextRecord = Pick<
  Organization,
  keyof typeof ORG_CONTEXT_SELECT
>;

type RequestCache = {
  orgById: Map<string, Promise<OrgContextRecord | null>>;
};

const requestCacheStore = new AsyncLocalStorage<RequestCache>();

export function runWithRequestCache<T>(fn: () => Promise<T>): Promise<T> {
  return requestCacheStore.run({ orgById: new Map() }, fn);
}

export async function getCachedOrganization(
  organizationId: string
): Promise<OrgContextRecord | null> {
  const cache = requestCacheStore.getStore();
  if (!cache) {
    return prisma.organization.findUnique({
      where: { id: organizationId },
      select: ORG_CONTEXT_SELECT,
    });
  }

  let pending = cache.orgById.get(organizationId);
  if (!pending) {
    pending = prisma.organization.findUnique({
      where: { id: organizationId },
      select: ORG_CONTEXT_SELECT,
    });
    cache.orgById.set(organizationId, pending);
  }
  return pending;
}

export function invalidateCachedOrganization(organizationId: string) {
  const cache = requestCacheStore.getStore();
  cache?.orgById.delete(organizationId);
}
