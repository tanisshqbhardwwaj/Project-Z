import type { ModuleKey } from "@/lib/org/modules";

export type EnabledModulesMap = Partial<Record<ModuleKey, boolean>>;

export function isModuleEnabled(
  modules: EnabledModulesMap | undefined,
  key: ModuleKey
): boolean {
  return Boolean(modules?.[key]);
}
