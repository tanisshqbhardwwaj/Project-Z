import type { BusinessType } from "@/lib/org/business-type";
import type { ShopSector } from "@/lib/org/shop-sector";
import type { EnabledModulesMap } from "@/hooks/use-enabled-modules";
import type { OrgSettingsJson } from "@/lib/org/modules";
import type { StaffAccess } from "@/lib/staff/access";
import { defaultStaffAccess } from "@/lib/staff/access";
import { isNativeShell } from "@/platform/common/native";

const CACHE_KEY = "businessos.native.display-cache.v1";

export type NativeDisplayCache = {
  userName: string;
  userEmail: string;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  activeBusinessType: BusinessType | null;
  activeShopSector: ShopSector | null;
  activeOrgSettings: OrgSettingsJson | null;
  timezone: string;
  enableStaff: boolean;
  enabledModules: EnabledModulesMap;
  role: string | null;
  linkedStaffId: string | null;
  linkedStaffName: string | null;
  linkedStaffAccess: StaffAccess;
  linkedStaffCanViewAttendance: boolean;
  isPlatformAdmin: boolean;
  cachedAt: string;
};

export function readNativeDisplayCache(): NativeDisplayCache | null {
  if (typeof window === "undefined" || !isNativeShell()) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NativeDisplayCache;
    if (!parsed?.cachedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeNativeDisplayCache(cache: NativeDisplayCache): void {
  if (typeof window === "undefined" || !isNativeShell()) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

export function clearNativeDisplayCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function displayCacheToAuthPartial(cache: NativeDisplayCache) {
  return {
    user: {
      id: "",
      email: cache.userEmail,
      name: cache.userName,
      phone: null,
      organizationMembers: [],
      isPlatformAdmin: cache.isPlatformAdmin,
    },
    activeOrganizationId: cache.activeOrganizationId,
    activeOrganizationName: cache.activeOrganizationName,
    activeBusinessType: cache.activeBusinessType,
    activeShopSector: cache.activeShopSector,
    activeOrgSettings: cache.activeOrgSettings,
    timezone: cache.timezone,
    enableStaff: cache.enableStaff,
    enabledModules: cache.enabledModules,
    role: cache.role,
    linkedStaffId: cache.linkedStaffId,
    linkedStaffName: cache.linkedStaffName,
    linkedStaffAccess: cache.linkedStaffAccess ?? defaultStaffAccess(),
    linkedStaffCanViewAttendance: cache.linkedStaffCanViewAttendance,
    isPlatformAdmin: cache.isPlatformAdmin,
    sessionVerified: false,
    status: "authenticated" as const,
    initialized: true,
    error: null,
  };
}
