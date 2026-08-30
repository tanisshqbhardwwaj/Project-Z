import { prisma } from "@/lib/db/prisma";

const touchCache = new Map<string, number>();
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/** Throttled org activity ping — at most once per hour per org. */
export async function touchOrganizationActivity(organizationId: string) {
  const now = Date.now();
  const last = touchCache.get(organizationId) ?? 0;
  if (now - last < TOUCH_INTERVAL_MS) return;
  touchCache.set(organizationId, now);
  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { lastActiveAt: new Date() },
    });
  } catch {
    touchCache.delete(organizationId);
  }
}
