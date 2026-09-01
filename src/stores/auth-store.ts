import { create } from "zustand";
import { apiFetch, ApiClientError, setActiveOrganizationId, getStoredOrganizationId } from "@/lib/api/client";
import type { BusinessType } from "@/lib/org/business-type";
import type { ShopSector } from "@/lib/org/shop-sector";
import type { BillingPlan } from "@prisma/client";
import type { EnabledModulesMap } from "@/hooks/use-enabled-modules";
import type { OrgSettingsJson } from "@/lib/org/modules";
import type { StaffAccess } from "@/lib/staff/access";
import { defaultStaffAccess } from "@/lib/staff/access";

export type OrgMembership = {
  organizationId: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    businessType?: BusinessType;
    shopSector?: ShopSector | null;
    enableStaff?: boolean;
    plan?: BillingPlan;
    timezone?: string;
    enabledModules?: EnabledModulesMap;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  organizationMembers: OrgMembership[];
  isPlatformAdmin?: boolean;
};

type AuthState = {
  user: AuthUser | null;
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
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  setActiveOrg: (
    orgId: string,
    orgName: string,
    role: string,
    businessType?: BusinessType | null,
    shopSector?: ShopSector | null,
    enableStaff?: boolean,
    enabledModules?: EnabledModulesMap,
    timezone?: string,
    linkedStaffId?: string | null,
    linkedStaffName?: string | null,
    orgSettings?: OrgSettingsJson | null,
    linkedStaffAccess?: StaffAccess | null
  ) => void;
  updateUser: (patch: Pick<AuthUser, "name" | "phone">) => void;
  logout: () => void;
};

function pickOrgFields(activeOrg: {
  businessType?: BusinessType;
  shopSector?: ShopSector | null;
  enableStaff?: boolean;
  enabledModules?: EnabledModulesMap;
  orgSettings?: OrgSettingsJson;
  timezone?: string;
} | undefined, membership: OrgMembership | undefined) {
  return {
    activeBusinessType:
      activeOrg?.businessType ??
      membership?.organization?.businessType ??
      ("CONTRACTOR" as BusinessType),
    activeShopSector:
      activeOrg?.shopSector ?? membership?.organization?.shopSector ?? null,
    enableStaff: Boolean(
      activeOrg?.enableStaff ?? membership?.organization?.enableStaff
    ),
    enabledModules:
      activeOrg?.enabledModules ??
      membership?.organization?.enabledModules ??
      {},
    activeOrgSettings: activeOrg?.orgSettings ?? null,
    timezone:
      activeOrg?.timezone ??
      membership?.organization?.timezone ??
      "Asia/Kolkata",
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeOrganizationId: null,
  activeOrganizationName: null,
  activeBusinessType: null,
  activeShopSector: null,
  activeOrgSettings: null,
  timezone: "Asia/Kolkata",
  enableStaff: false,
  enabledModules: {},
  role: null,
  linkedStaffId: null,
  linkedStaffName: null,
  linkedStaffAccess: defaultStaffAccess(),
  linkedStaffCanViewAttendance: false,
  isPlatformAdmin: false,
  status: "idle",
  error: null,
  initialized: false,

  bootstrap: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });

    try {
      const [me, orgList] = await Promise.all([
        apiFetch<AuthUser>("/api/v1/auth/me"),
        fetch("/api/v1/organizations/list").then((r) => r.json()),
      ]);

      const membershipIds = new Set(
        (me.organizationMembers ?? []).map((m) => m.organizationId)
      );
      const storedId = getStoredOrganizationId();
      const sessionId =
        typeof orgList.data?.activeOrganizationId === "string"
          ? orgList.data.activeOrganizationId
          : null;

      const activeId =
        (storedId && membershipIds.has(storedId) ? storedId : null) ??
        (sessionId && membershipIds.has(sessionId) ? sessionId : null) ??
        me.organizationMembers?.[0]?.organizationId ??
        null;

      const activeOrg = orgList.data?.organizations?.find(
        (o: { id: string }) => o.id === activeId
      );

      const membership = me.organizationMembers?.find(
        (m) => m.organizationId === activeId
      );

      const fields = pickOrgFields(activeOrg, membership);

      setActiveOrganizationId(activeId);

      set({
        user: me,
        activeOrganizationId: activeId,
        activeOrganizationName:
          activeOrg?.name ?? membership?.organization?.name ?? null,
        ...fields,
        role: activeOrg?.role ?? membership?.role ?? null,
        linkedStaffId: activeOrg?.linkedStaff?.id ?? null,
        linkedStaffName: activeOrg?.linkedStaff?.name ?? null,
        linkedStaffAccess:
          activeOrg?.linkedStaff?.access ?? defaultStaffAccess(),
        linkedStaffCanViewAttendance:
          activeOrg?.linkedStaff?.access?.canViewOwnAttendance === true,
        isPlatformAdmin: Boolean(me.isPlatformAdmin),
        status: "authenticated",
        initialized: true,
        error: null,
      });
    } catch (err) {
      const httpStatus =
        err instanceof ApiClientError ? err.status : undefined;
      if (httpStatus === 401 || httpStatus === 403) {
        setActiveOrganizationId(null);
        set({
          user: null,
          activeOrganizationId: null,
          activeOrganizationName: null,
          activeBusinessType: null,
          activeShopSector: null,
          activeOrgSettings: null,
          timezone: "Asia/Kolkata",
          enableStaff: false,
          enabledModules: {},
          role: null,
          linkedStaffId: null,
          linkedStaffName: null,
          linkedStaffAccess: defaultStaffAccess(),
          linkedStaffCanViewAttendance: false,
          isPlatformAdmin: false,
          status: "unauthenticated",
          initialized: true,
          error: null,
        });
        return;
      }

      set({
        status: "error",
        initialized: true,
        error:
          err instanceof Error
            ? err.message
            : "Could not load your session. Refresh and try again.",
      });
    }
  },

  setActiveOrg: (
    orgId,
    orgName,
    role,
    businessType = "CONTRACTOR",
    shopSector = null,
    enableStaff = false,
    enabledModules = {},
    timezone = "Asia/Kolkata",
    linkedStaffId = null,
    linkedStaffName = null,
    orgSettings: OrgSettingsJson | null = null,
    linkedStaffAccess: StaffAccess | null = null
  ) => {
    const access = linkedStaffAccess ?? defaultStaffAccess();
    setActiveOrganizationId(orgId);
    set({
      activeOrganizationId: orgId,
      activeOrganizationName: orgName,
      activeBusinessType: businessType ?? "CONTRACTOR",
      activeShopSector: shopSector ?? null,
      enableStaff: Boolean(enableStaff),
      enabledModules,
      activeOrgSettings: orgSettings,
      timezone,
      role,
      linkedStaffId: linkedStaffId ?? null,
      linkedStaffName: linkedStaffName ?? null,
      linkedStaffAccess: access,
      linkedStaffCanViewAttendance: access.canViewOwnAttendance,
    });
  },

  updateUser: (patch) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : null,
    }));
  },

  logout: () => {
    setActiveOrganizationId(null);
    set({
      user: null,
      activeOrganizationId: null,
      activeOrganizationName: null,
      activeBusinessType: null,
      activeShopSector: null,
      activeOrgSettings: null,
      timezone: "Asia/Kolkata",
      enableStaff: false,
      enabledModules: {},
      role: null,
      linkedStaffId: null,
      linkedStaffName: null,
      linkedStaffAccess: defaultStaffAccess(),
      linkedStaffCanViewAttendance: false,
      isPlatformAdmin: false,
      status: "unauthenticated",
      initialized: true,
    });
  },
}));
