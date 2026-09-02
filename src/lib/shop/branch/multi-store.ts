import type { OrgSettingsJson } from "@/lib/org/modules";

export type CustomerScope = "SHARED" | "ISOLATED";

export type MultiStoreSettings = {
  enabled: boolean;
  customerScope: CustomerScope;
};

export const DEFAULT_MULTI_STORE_SETTINGS: MultiStoreSettings = {
  enabled: false,
  customerScope: "SHARED",
};

export function readMultiStoreSettings(
  settings: OrgSettingsJson | null | undefined
): MultiStoreSettings {
  const raw = settings?.shop?.multiStore;
  if (!raw || typeof raw !== "object") return DEFAULT_MULTI_STORE_SETTINGS;
  const m = raw as Record<string, unknown>;
  return {
    enabled: m.enabled === true,
    customerScope: m.customerScope === "ISOLATED" ? "ISOLATED" : "SHARED",
  };
}

export function mergeMultiStoreSettings(
  settings: OrgSettingsJson | null | undefined,
  patch: Partial<MultiStoreSettings>
): OrgSettingsJson {
  const current = readMultiStoreSettings(settings);
  const next: MultiStoreSettings = {
    enabled: patch.enabled ?? current.enabled,
    customerScope: patch.customerScope ?? current.customerScope,
  };
  return {
    ...(settings ?? {}),
    shop: {
      ...(settings?.shop ?? {}),
      multiStore: next,
    },
  };
}

/** Whether the org has more than one active branch (multi-store UX). */
export function shouldShowBranchSwitcher(
  multiStore: MultiStoreSettings,
  branchCount: number
): boolean {
  return multiStore.enabled && branchCount > 1;
}

/** branchId stored on customers when scope is ISOLATED; null when SHARED. */
export function customerBranchIdForCreate(
  scope: CustomerScope,
  activeBranchId: string
): string | null {
  return scope === "ISOLATED" ? activeBranchId : null;
}

export function customerScopeFilter(
  scope: CustomerScope,
  branchId: string
): { branchId: string | null } | Record<string, never> {
  if (scope === "ISOLATED") return { branchId };
  return {};
}
