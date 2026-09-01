"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { buildCursorListUrl } from "@/lib/api/list-url";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { LoadMoreTrigger } from "@/components/ui/load-more-trigger";
import { ListFetchIndicator } from "@/components/ui/list-fetch-indicator";
import { cn } from "@/lib/utils";
import { useInfiniteShopList } from "@/hooks/use-infinite-shop-list";
import type {
  ActivityDatePreset,
  ActivityModuleFilter,
} from "@/services/shop/shop-activity.service";

type ActivityRow = {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

type ActivityActor = { id: string; name: string };

const MODULE_CHIPS: { key: ActivityModuleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "invoices", label: "Invoices" },
  { key: "inventory", label: "Inventory" },
  { key: "purchases", label: "Purchases" },
  { key: "expenses", label: "Expenses" },
  { key: "udhaar", label: "Udhaar" },
  { key: "returns", label: "Returns" },
  { key: "offers", label: "Offers" },
  { key: "staff", label: "Staff" },
];

const DATE_CHIPS: { key: ActivityDatePreset; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export default function ShopActivityPage() {
  const { activeBusinessType, activeOrganizationId, enabledModules } = useAuthStore();
  const orgId = activeOrganizationId;
  const enabled = isModuleEnabled(enabledModules, "shop_activity");
  const title = moduleLabel("shop_activity", activeBusinessType ?? "SHOPKEEPER");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ActivityModuleFilter>("all");
  const [datePreset, setDatePreset] = useState<ActivityDatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [userId, setUserId] = useState("");

  const {
    items: logs,
    isInitialLoading,
    isSearchPending,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteShopList<ActivityRow>({
    queryKey: orgId
      ? [
          ...queryKeys.modules.shop.activity(orgId),
          moduleFilter,
          datePreset,
          customFrom,
          customTo,
          userId,
        ]
      : ["disabled"],
    buildUrl: (cursor, debouncedSearch) =>
      buildCursorListUrl("/api/v1/shop/activity", {
        q: debouncedSearch.trim() || undefined,
        module: moduleFilter !== "all" ? moduleFilter : undefined,
        date: datePreset !== "all" ? datePreset : undefined,
        from: datePreset === "custom" ? customFrom || undefined : undefined,
        to: datePreset === "custom" ? customTo || undefined : undefined,
        userId: userId || undefined,
        limit: 50,
      }, cursor),
    enabled: !!orgId && enabled,
    search,
  });

  const actorsQuery = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.activity(orgId), "actors"] : ["disabled"],
    queryFn: () => apiFetch<ActivityActor[]>("/api/v1/shop/activity?actors=1"),
    enabled: !!orgId && enabled,
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Activity Trail is owner-only. Enable it in Features.
      </p>
    );
  }

  if (isInitialLoading) return <PageLoader label="Loading activity trail..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load"}
      </p>
    );
  }

  const logsList = logs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Append-only audit trail — filter by module, date, or person
        </p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Recent activity
            <ListFetchIndicator active={isSearchPending} className="ml-1" />
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, descriptions, people…"
              className="h-11 rounded-xl pl-9"
              aria-busy={isSearchPending}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Module</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MODULE_CHIPS.map(({ key, label }) => (
                <FilterChip
                  key={key}
                  active={moduleFilter === key}
                  onClick={() => setModuleFilter(key)}
                >
                  {label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Date</p>
            <div className="flex flex-wrap gap-2">
              {DATE_CHIPS.map(({ key, label }) => (
                <FilterChip
                  key={key}
                  active={datePreset === key}
                  onClick={() => setDatePreset(key)}
                >
                  {label}
                </FilterChip>
              ))}
            </div>
            {datePreset === "custom" ? (
              <div className="space-y-1">
                <Label className="text-xs">Date range</Label>
                <DateRangePicker
                  from={customFrom}
                  to={customTo}
                  onFromChange={setCustomFrom}
                  onToChange={setCustomTo}
                  className="h-10 min-w-[240px] rounded-xl"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Person</Label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 w-full max-w-xs rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">Everyone</option>
              {(actorsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {logsList.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No activity matches these filters.
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {logsList.map((log) => {
                const dt = new Date(log.createdAt);
                return (
                  <li key={log.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {log.userName} · {log.userRole}
                        </p>
                        <p className="text-muted-foreground">
                          {log.module} — {log.description}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{dt.toLocaleDateString("en-IN")}</p>
                        <p>
                          {dt.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                );
                })}
              </ul>
              <LoadMoreTrigger
                hasMore={!!hasNextPage}
                isLoading={isFetchingNextPage}
                onLoadMore={() => fetchNextPage()}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
