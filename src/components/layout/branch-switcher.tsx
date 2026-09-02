"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Store, ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  apiFetch,
  setActiveBranchId,
  getActiveBranchId,
  BRANCH_ALL,
} from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { shouldShowBranchSwitcher } from "@/lib/shop/branch/multi-store";
import type { MultiStoreSettings } from "@/lib/shop/branch/multi-store";

type BranchItem = {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
};

export function BranchSwitcher() {
  const queryClient = useQueryClient();
  const { activeOrganizationId, activeOrgSettings } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [multiStore, setMultiStore] = useState<MultiStoreSettings | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => getActiveBranchId());

  useEffect(() => {
    if (!activeOrganizationId) return;
    let cancelled = false;
    apiFetch<{ settings: MultiStoreSettings; branches: BranchItem[] }>(
      "/api/v1/shop/branches?config=1"
    )
      .then((data) => {
        if (cancelled) return;
        setMultiStore(data.settings);
        setBranches(data.branches ?? []);
        const stored = getActiveBranchId();
        const valid =
          stored === BRANCH_ALL
            ? BRANCH_ALL
            : stored && data.branches.some((b) => b.id === stored)
              ? stored
              : data.settings.enabled
                ? BRANCH_ALL
                : data.branches.find((b) => b.isDefault)?.id ?? data.branches[0]?.id ?? null;
        if (valid) {
          setActiveBranchId(valid);
          setActiveId(valid);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, activeOrgSettings]);

  if (!shouldShowBranchSwitcher(multiStore ?? { enabled: false, customerScope: "SHARED" }, branches.length)) {
    return null;
  }

  const activeLabel =
    activeId === BRANCH_ALL
      ? "All branches"
      : (branches.find((b) => b.id === activeId) ?? branches[0])?.name ?? "Branch";

  function switchBranch(branchId: string) {
    setActiveBranchId(branchId);
    setActiveId(branchId);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["org"] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[180px] gap-2 rounded-xl border-dashed px-3"
        >
          {activeId === BRANCH_ALL ? (
            <Layers className="h-4 w-4 shrink-0 opacity-70" />
          ) : (
            <Store className="h-4 w-4 shrink-0 opacity-70" />
          )}
          <span className="truncate">{activeLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <button
          type="button"
          onClick={() => switchBranch(BRANCH_ALL)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            activeId === BRANCH_ALL && "bg-accent font-medium"
          )}
        >
          <Layers className="h-4 w-4 shrink-0 opacity-60" />
          <span>All branches</span>
        </button>
        <div className="my-1 h-px bg-border" />
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => switchBranch(branch.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
              branch.id === activeId && "bg-accent font-medium"
            )}
          >
            <span className="truncate">{branch.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{branch.code}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
