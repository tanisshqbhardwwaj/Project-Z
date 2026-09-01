import type { ModuleKey } from "@/lib/org/modules";

/** Client-safe add-on metadata (no DB imports). */
export const ADDON_CATALOG = {
  extra_storage: { label: "Extra cloud storage", modules: [] as ModuleKey[] },
  extra_staff: { label: "Extra staff module", modules: ["staff"] as ModuleKey[] },
  advanced_reports: {
    label: "Advanced reports (activity trail)",
    modules: ["shop_activity"] as ModuleKey[],
  },
  multi_store: {
    label: "Multi-store branches",
    modules: [] as ModuleKey[],
  },
} as const;

export type AddonKey = keyof typeof ADDON_CATALOG;

export const MULTI_STORE_ADDON_KEY: AddonKey = "multi_store";

const ADDON_MODULE_GRANTS: Record<string, ModuleKey[]> = Object.fromEntries(
  Object.entries(ADDON_CATALOG).map(([key, def]) => [key, def.modules])
);

export function addonModuleGrants(addonKey: string): ModuleKey[] {
  return ADDON_MODULE_GRANTS[addonKey] ?? [];
}
