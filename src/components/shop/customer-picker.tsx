"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCustomerLabel } from "@/lib/shop/customer";
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

  const { data: suggestions = [] } = useQuery({
    queryKey: orgId
      ? queryKeys.modules.shop.customerRegistry(orgId, queryTerm)
      : ["disabled"],
    queryFn: () =>
      apiFetch<ShopCustomerOption[]>(
        `/api/v1/shop/customers${queryTerm ? `?q=${encodeURIComponent(queryTerm)}` : ""}`
      ),
    enabled: !!orgId && open && queryTerm.length >= 1,
  });

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
    <div ref={containerRef} className="space-y-3">
      {selectedCustomerId ? (
        <div className="flex items-center justify-between rounded-xl border bg-primary/5 px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
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

      <div className="relative grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Customer</Label>
          <Input
            value={customerName}
            onChange={(e) => {
              onCustomerNameChange(e.target.value);
              onSelectCustomer(null);
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="h-11 rounded-xl"
            placeholder="Search name or pick walk-in"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={customerPhone}
            onChange={(e) => {
              onCustomerPhoneChange(e.target.value);
              onSelectCustomer(null);
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="h-11 rounded-xl"
            placeholder="Mobile (distinguishes same name)"
            autoComplete="off"
          />
        </div>

        {open && queryTerm.length >= 1 && suggestions.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border bg-popover shadow-lg sm:col-span-2">
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

      <div className="space-y-2">
        <Label>GSTIN</Label>
        <Input
          value={customerGstin}
          onChange={(e) => onCustomerGstinChange(e.target.value)}
          className="h-11 rounded-xl font-mono uppercase"
          placeholder="Customer GSTIN (optional)"
        />
      </div>
    </div>
  );
}
