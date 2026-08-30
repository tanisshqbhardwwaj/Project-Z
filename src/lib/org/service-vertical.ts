import type { BusinessType } from "@prisma/client";
import { BUSINESS_TYPES } from "@/lib/org/business-type";
import type { ModuleKey } from "@/lib/org/modules";

/** Service vertical (appointments, packages, AMC, commissions) is not production-ready yet. */
export const SERVICE_VERTICAL_ENABLED = false;

export const SERVICE_MODULE_KEYS = [
  "service_appointments",
  "service_packages",
  "service_contracts",
  "service_commissions",
] as const satisfies readonly ModuleKey[];

export function isServiceVerticalEnabled(): boolean {
  return SERVICE_VERTICAL_ENABLED;
}

export function isServiceModuleKey(key: ModuleKey): boolean {
  return (SERVICE_MODULE_KEYS as readonly ModuleKey[]).includes(key);
}

export function stripDisabledServiceModules<T extends Partial<Record<ModuleKey, boolean>>>(
  modules: T
): T {
  if (isServiceVerticalEnabled()) return modules;
  const next = { ...modules };
  for (const key of SERVICE_MODULE_KEYS) {
    next[key] = false;
  }
  return next;
}

export function onboardingBusinessTypes(): readonly BusinessType[] {
  if (isServiceVerticalEnabled()) return BUSINESS_TYPES;
  return BUSINESS_TYPES.filter((type) => type !== "SERVICE");
}

/** Onboarding + org settings: keep current SERVICE org visible even when the vertical is disabled. */
export function selectableBusinessTypes(
  current?: BusinessType | null
): readonly BusinessType[] {
  const base = onboardingBusinessTypes();
  if (current === "SERVICE" && !base.includes("SERVICE")) {
    return [...base, "SERVICE"];
  }
  return base;
}
