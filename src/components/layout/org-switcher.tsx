"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";
import { useAuthStore } from "@/stores/auth-store";
import { setActiveOrganizationId } from "@/lib/api/client";
import type { BusinessType } from "@/lib/org/business-type";
import { getBusinessTypeConfig } from "@/lib/org/business-type";
import type { ShopSector } from "@/lib/org/shop-sector";
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
  linkedStaff?: { id: string; name: string } | null;
};

export function OrgSwitcher({ currentOrgName }: { currentOrgName?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { update } = useSession();
  const { activeOrganizationId, setActiveOrg } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [canCreateMore, setCanCreateMore] = useState(false);

  useEffect(() => {
    fetch("/api/v1/organizations/list")
      .then((r) => r.json())
      .then((d) => {
        setOrgs(d.data?.organizations ?? []);
        setCanCreateMore(d.data?.canCreateMore ?? false);
      })
      .catch(() => {});
  }, [activeOrganizationId]);

  async function switchOrg(org: OrgItem) {
    await fetch("/api/v1/organizations/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id }),
    });
    await update({ activeOrganizationId: org.id });
    setActiveOrganizationId(org.id);
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
      org.linkedStaff?.name ?? null
    );
    queryClient.invalidateQueries({ queryKey: ["org", org.id] });
    setOpen(false);
    router.refresh();
  }

  const activeName =
    orgs.find((o) => o.id === activeOrganizationId)?.name ?? currentOrgName ?? "Organization";

  if (orgs.length <= 1 && !canCreateMore) {
    return (
      <div className="flex h-9 min-w-0 max-w-full items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate text-sm font-medium">{activeName}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 min-w-0 max-w-full justify-start gap-2 px-2 sm:max-w-[220px]"
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
            className={cn(
              "flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-accent",
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
  );
}
