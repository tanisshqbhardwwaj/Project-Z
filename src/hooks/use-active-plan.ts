import type { BillingPlan } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";

export function useActivePlan(): BillingPlan | null {
  const user = useAuthStore((s) => s.user);
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const membership = user?.organizationMembers?.find(
    (m) => m.organizationId === orgId
  );
  return membership?.organization?.plan ?? null;
}
