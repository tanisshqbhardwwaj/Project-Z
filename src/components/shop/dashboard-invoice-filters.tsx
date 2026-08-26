"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceSort } from "@/lib/shop/invoice-list-filters";

const SORT_OPTIONS: { value: InvoiceSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount-high", label: "Amount: high to low" },
  { value: "amount-low", label: "Amount: low to high" },
];

type DashboardInvoiceFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  payment: string;
  onPaymentChange: (value: string) => void;
  sort: InvoiceSort;
  onSortChange: (value: InvoiceSort) => void;
  paymentMethods: string[];
  compact?: boolean;
};

export function DashboardInvoiceFilters({
  search,
  onSearchChange,
  payment,
  onPaymentChange,
  sort,
  onSortChange,
  paymentMethods,
  compact = false,
}: DashboardInvoiceFiltersProps) {
  return (
    <div className={compact ? "space-y-3 px-4 pt-3" : "space-y-3"}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search bill #, customer, phone…"
          className="h-10 rounded-xl pl-9"
        />
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Payment</Label>
          <select
            value={payment}
            onChange={(e) => onPaymentChange(e.target.value)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
          >
            <option value="all">All methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sort</Label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as InvoiceSort)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
