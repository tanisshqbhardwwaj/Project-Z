"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";
import { useAuthStore } from "@/stores/auth-store";
import {
  appFetch,
  setActiveOrganizationId,
  setActiveBranchId,
} from "@/lib/api/client";
import { clearOrgClientState } from "@/lib/org/clear-org-client-state";
import type { BusinessType } from "@/lib/org/business-type";
import { getBusinessTypeConfig } from "@/lib/org/business-type";
import type { ShopSector } from "@/lib/org/shop-sector";
import type { OrgSettingsJson } from "@/lib/org/modules";
import type { EnabledModulesMap } from "@/hooks/use-enabled-modules";

type OrgItem = {
  id: string;
  name: string;
  role: string;
  businessType?: BusinessType;
  shopSector?: ShopSector | null;
  enableStaff?: boolean;
  timezone?: string;
  enabledModules?: EnabledModulesMap;
  orgSettings?: OrgSettingsJson | null;
  linkedStaff?: {
    id: string;
    name: string;
    access?: import("@/lib/staff/access").StaffAccess;
  } | null;
};

type SwitchResponse = {
  data?: {
    activeOrganizationId: string;
    redirectTo?: string;
  };
};

export function OrgSwitcher({ currentOrgName }: { currentOrgName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { update } = useSession();
  const { user, activeOrganizationId, sessionVerified, status, setActiveOrg } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [listOrgs, setListOrgs] = useState<OrgItem[] | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const membershipOrgs: OrgItem[] = (user?.organizationMembers ?? []).map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
    businessType: m.organization.businessType,
    shopSector: m.organization.shopSector ?? null,
    enableStaff: m.organization.enableStaff,
    timezone: m.organization.timezone,
    enabledModules: m.organization.enabledModules,
    linkedStaff: null,
  }));

  const orgs = listOrgs ?? membershipOrgs;
  const canCreateMore = orgs.length < MAX_ORGANIZATIONS;
  const switching = switchingId !== null;

  useEffect(() => {
    appFetch("/api/v1/organizations/list")
      .then((r) => r.json())
      .then((d) => {
        if (!d.data?.organizations) return;
        setListOrgs(d.data.organizations);
      })
      .catch(() => {});
  }, [activeOrganizationId]);

  async function switchOrg(org: OrgItem) {
    if (org.id === activeOrganizationId || switchingId) return;
    if (status !== "authenticated" || !sessionVerified) return;
    setSwitchingId(org.id);
    setOpen(false);
    try {
      const res = await appFetch("/api/v1/organizations/switch", {
        method: "POST",
        body: JSON.stringify({ organizationId: org.id, returnTo: pathname }),
      });
      if (!res.ok) return;
      const payload = (await res.json()) as SwitchResponse;
      const redirectTo = payload.data?.redirectTo ?? "/dashboard";

      await update({ activeOrganizationId: org.id });
      setActiveOrganizationId(org.id);
      setActiveBranchId(null);
      clearOrgClientState();
      setActiveOrg(
        org.id,
        org.name,
        org.role,
        org.businessType,
        org.shopSector ?? null,
        Boolean(org.enableStaff),
        org.enabledModules ?? {},
        org.timezone ?? "Asia/Kolkata",
        org.linkedStaff?.id ?? null,
        org.linkedStaff?.name ?? null,
        org.orgSettings ?? null,
        org.linkedStaff?.access ?? null
      );
      queryClient.removeQueries({ queryKey: ["org"] });
      router.replace(redirectTo);
    } finally {
      setSwitchingId(null);
    }
  }

  const activeName =
    orgs.find((o) => o.id === activeOrganizationId)?.name ?? currentOrgName ?? "Organization";

  if (orgs.length <= 1 && !canCreateMore) {
    return (
      <div className="flex h-9 min-w-0 max-w-[min(100%,240px)] shrink-0 items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate text-sm font-medium">{activeName}</span>
      </div>
    );
  }

  return (
    <>
      {switching ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground">Switching organization…</p>
        </div>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            disabled={switching || status !== "authenticated" || !sessionVerified}
            className="h-9 min-w-0 max-w-[min(100%,240px)] shrink-0 justify-start gap-2 px-2"
          >
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">{activeName}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Organizations ({orgs.length}/{MAX_ORGANIZATIONS})
          </p>
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              disabled={switching}
              className={cn(
                "flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-accent disabled:opacity-60",
                org.id === activeOrganizationId && "bg-accent"
              )}
              onClick={() => switchOrg(org)}
            >
              <span className="text-sm font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground">
                {getBusinessTypeConfig(org.businessType).label} · {org.role}
              </span>
            </button>
          ))}
          {canCreateMore && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                setOpen(false);
                router.push("/onboarding?new=1");
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Organization
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
