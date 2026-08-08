import { create } from "zustand";
import { apiFetch, setActiveOrganizationId } from "@/lib/api/client";

export type OrgMembership = {
  organizationId: string;
  role: string;
  organization: { id: string; name: string; slug: string };
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  organizationMembers: OrgMembership[];
};

type AuthState = {
  user: AuthUser | null;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  role: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  setActiveOrg: (orgId: string, orgName: string, role: string) => void;
  updateUser: (patch: Pick<AuthUser, "name" | "phone">) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeOrganizationId: null,
  activeOrganizationName: null,
  role: null,
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

      const activeId =
        orgList.data?.activeOrganizationId ??
        me.organizationMembers?.[0]?.organizationId ??
        null;

      const activeOrg = orgList.data?.organizations?.find(
        (o: { id: string }) => o.id === activeId
      );

      const membership = me.organizationMembers?.find(
        (m) => m.organizationId === activeId
      );

      setActiveOrganizationId(activeId);

      set({
        user: me,
        activeOrganizationId: activeId,
        activeOrganizationName:
          activeOrg?.name ?? membership?.organization?.name ?? null,
        role: activeOrg?.role ?? membership?.role ?? null,
        status: "authenticated",
        initialized: true,
        error: null,
      });
    } catch {
      setActiveOrganizationId(null);
      set({
        user: null,
        activeOrganizationId: null,
        activeOrganizationName: null,
        role: null,
        status: "unauthenticated",
        initialized: true,
        error: null,
      });
    }
  },

  setActiveOrg: (orgId, orgName, role) => {
    setActiveOrganizationId(orgId);
    set({
      activeOrganizationId: orgId,
      activeOrganizationName: orgName,
      role,
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
      role: null,
      status: "unauthenticated",
      initialized: true,
    });
  },
}));
