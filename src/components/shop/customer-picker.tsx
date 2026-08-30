"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { buildCursorListUrl } from "@/lib/api/list-url";
import type { CursorPage } from "@/lib/api/cursor-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCustomerLabel } from "@/lib/shop/customer";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";

export type ShopCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  _count?: { sales: number };
};

type CustomerPickerProps = {
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  selectedCustomerId: string | null;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onCustomerGstinChange: (value: string) => void;
  onSelectCustomer: (customer: ShopCustomerOption | null) => void;
  compact?: boolean;
};

export function CustomerPicker({
  customerName,
  customerPhone,
  customerGstin,
  selectedCustomerId,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerGstinChange,
  onSelectCustomer,
  compact = false,
}: CustomerPickerProps) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const queryTerm = useMemo(() => {
    const parts = [customerName.trim(), customerPhone.trim(), search.trim()].filter(
      Boolean
    );
    return parts.join(" ").trim();
  }, [customerName, customerPhone, search]);

  const debouncedTerm = useDebouncedValue(queryTerm);

  const { data: suggestionsPage } = useQuery({
    queryKey: orgId
      ? queryKeys.modules.shop.customerRegistry(orgId, debouncedTerm)
      : ["disabled"],
    queryFn: () =>
      apiFetch<CursorPage<ShopCustomerOption>>(
        buildCursorListUrl("/api/v1/shop/customers", {
          q: debouncedTerm || undefined,
          limit: 10,
        })
      ),
    enabled: !!orgId && open && debouncedTerm.length >= 1,
    placeholderData: keepPreviousData,
  });

  const suggestions = suggestionsPage?.items ?? [];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickCustomer(customer: ShopCustomerOption) {
    onSelectCustomer(customer);
    onCustomerNameChange(customer.name);
    onCustomerPhoneChange(customer.phone ?? "");
    onCustomerGstinChange(customer.gstin ?? "");
    setOpen(false);
    setSearch("");
  }

  function clearSelection() {
    onSelectCustomer(null);
  }

  return (
    <div ref={containerRef} className={cn("space-y-2", compact && "space-y-1.5")}>
      {selectedCustomerId ? (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border bg-primary/5 px-2.5 text-sm",
            compact ? "py-1" : "rounded-xl px-3 py-2"
          )}
        >
          <span className="flex items-center gap-1.5 text-xs sm:text-sm">
            <UserRound className="h-3.5 w-3.5 text-primary" />
            Saved customer linked
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={clearSelection}
          >
            Clear
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "relative grid gap-2",
          compact ? "sm:grid-cols-3" : "gap-3 sm:grid-cols-2"
        )}
      >
        <div className={cn("space-y-1", !compact && "space-y-2")}>
          <Label className={compact ? "text-xs" : undefined}>Customer</Label>
          <Input
            value={customerName}
            onChange={(e) => {
              onCustomerNameChange(e.target.value);
              onSelectCustomer(null);
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className={cn("rounded-lg", compact ? "h-9 text-sm" : "h-11 rounded-xl")}
            placeholder="Search name or walk-in"
            autoComplete="off"
          />
        </div>
        <div className={cn("space-y-1", !compact && "space-y-2")}>
          <Label className={compact ? "text-xs" : undefined}>Phone</Label>
          <Input
            value={customerPhone}
            onChange={(e) => {
              onCustomerPhoneChange(e.target.value);
              onSelectCustomer(null);
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className={cn("rounded-lg", compact ? "h-9 text-sm" : "h-11 rounded-xl")}
            placeholder="Mobile"
            autoComplete="off"
          />
        </div>

        {compact ? (
          <div className="space-y-1">
            <Label className="text-xs">GSTIN</Label>
            <Input
              value={customerGstin}
              onChange={(e) => onCustomerGstinChange(e.target.value)}
              className="h-9 rounded-lg text-sm"
              placeholder="Optional"
            />
          </div>
        ) : null}

        {open && debouncedTerm.length >= 1 && suggestions.length > 0 ? (
          <div
            className={cn(
              "absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border bg-popover shadow-lg",
              compact ? "sm:col-span-3" : "sm:col-span-2"
            )}
          >
            {suggestions.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent",
                  selectedCustomerId === customer.id && "bg-accent"
                )}
                onClick={() => pickCustomer(customer)}
              >
                <span className="font-medium">
                  {formatCustomerLabel(customer)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {customer._count?.sales ?? 0} bill
                  {(customer._count?.sales ?? 0) === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="space-y-2">
          <Label>GSTIN</Label>
          <Input
            value={customerGstin}
            onChange={(e) => onCustomerGstinChange(e.target.value)}
            className="h-11 rounded-xl font-mono uppercase"
            placeholder="Customer GSTIN (optional)"
          />
        </div>
      ) : null}
    </div>
  );
}
