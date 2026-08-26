"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customer";
import type { ShopDashboardPeriod } from "@/lib/shop/dashboard-period";
import {
  filterSortInvoices,
  type InvoiceSort,
} from "@/lib/shop/invoice-list-filters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { DashboardInvoiceFilters } from "@/components/shop/dashboard-invoice-filters";

type DashboardPeriod = ShopDashboardPeriod;

type StaffSummary = {
  name: string;
  salesPaise: string;
  invoiceCount: number;
  targetRupees: number;
  progressPercent: number | null;
};

type StaffInvoicesData = {
  staffName: string;
  period: DashboardPeriod;
  salesPaise: string;
  invoiceCount: number;
  invoices: Array<{
    id: string;
    billNumber: string | null;
    customerName: string | null;
    customerPhone: string | null;
    totalPaise: string;
    paymentMethod: string;
    createdAt: string;
  }>;
};

type StaffSalesSidebarProps = {
  open: boolean;
  period: DashboardPeriod;
  exactDate: string;
  periodLabel: string;
  staffList: StaffSummary[];
  paymentMethods: string[];
  selectedStaff: string | null;
  onClose: () => void;
  onSelectStaff: (name: string | null) => void;
};

export function StaffSalesSidebar({
  open,
  period,
  exactDate,
  periodLabel,
  staffList,
  paymentMethods,
  selectedStaff,
  onClose,
  onSelectStaff,
}: StaffSalesSidebarProps) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const [staffSearch, setStaffSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePayment, setInvoicePayment] = useState("all");
  const [invoiceSort, setInvoiceSort] = useState<InvoiceSort>("newest");

  const detailQuery = useQuery({
    queryKey:
      orgId && selectedStaff
        ? [
            ...queryKeys.modules.shop.staffInvoices(orgId, period, selectedStaff),
            period === "date" ? exactDate : "",
          ]
        : ["disabled"],
    queryFn: () => {
      const params = new URLSearchParams({
        period,
        staffName: selectedStaff!,
      });
      if (period === "date") params.set("date", exactDate);
      return apiFetch<StaffInvoicesData>(
        `/api/v1/shop/dashboard/staff-invoices?${params}`
      );
    },
    enabled: open && !!orgId && !!selectedStaff,
  });

  const filteredStaffList = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter((staff) => staff.name.toLowerCase().includes(q));
  }, [staffList, staffSearch]);

  const filteredInvoices = useMemo(
    () =>
      filterSortInvoices(detailQuery.data?.invoices ?? [], {
        search: invoiceSearch,
        payment: invoicePayment,
        sort: invoiceSort,
      }),
    [detailQuery.data?.invoices, invoiceSearch, invoicePayment, invoiceSort]
  );

  if (!open) return null;

  const selectedSummary = selectedStaff
    ? staffList.find((s) => s.name === selectedStaff)
    : null;

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          {selectedStaff ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-lg"
              onClick={() => {
                onSelectStaff(null);
                setInvoiceSearch("");
                setInvoicePayment("all");
                setInvoiceSort("newest");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">
              {selectedStaff ?? "Sales by staff"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {periodLabel.toLowerCase()}
              {selectedStaff && selectedSummary
                ? ` · ${selectedSummary.invoiceCount} bill${selectedSummary.invoiceCount === 1 ? "" : "s"} · ${formatINR(selectedSummary.salesPaise)}`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {!selectedStaff ? (
            <>
              <div className="border-b px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search staff…"
                    className="h-10 rounded-xl pl-9"
                  />
                </div>
              </div>
              {filteredStaffList.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No staff match your search.</p>
              ) : (
                <ul className="divide-y">
                  {filteredStaffList.map((staff) => (
                    <li key={staff.name}>
                      <button
                        type="button"
                        onClick={() => onSelectStaff(staff.name)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.invoiceCount} bill
                            {staff.invoiceCount === 1 ? "" : "s"}
                            {period === "month" && staff.targetRupees > 0
                              ? ` · ${staff.progressPercent ?? 0}% of target`
                              : ""}
                          </p>
                          {period === "month" && staff.targetRupees > 0 ? (
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  (staff.progressPercent ?? 0) >= 100
                                    ? "bg-emerald-500"
                                    : "bg-primary"
                                )}
                                style={{ width: `${staff.progressPercent ?? 0}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatINR(staff.salesPaise)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : detailQuery.isLoading ? (
            <PageLoader label="Loading invoices…" />
          ) : detailQuery.error ? (
            <p className="p-4 text-sm text-destructive">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Failed to load invoices"}
            </p>
          ) : (
            <>
              <DashboardInvoiceFilters
                compact
                search={invoiceSearch}
                onSearchChange={setInvoiceSearch}
                payment={invoicePayment}
                onPaymentChange={setInvoicePayment}
                sort={invoiceSort}
                onSortChange={setInvoiceSort}
                paymentMethods={paymentMethods}
              />
              {filteredInvoices.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {(detailQuery.data?.invoices.length ?? 0) === 0
                    ? "No invoices found."
                    : "No invoices match your search or filters."}
                </p>
              ) : (
                <ul className="divide-y">
                  {filteredInvoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/shop/invoices/${inv.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                        onClick={onClose}
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {inv.customerName
                              ? formatCustomerLabel({
                                  name: inv.customerName,
                                  phone: inv.customerPhone,
                                })
                              : "Walk-in"}
                            {inv.billNumber ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                #{inv.billNumber}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleString("en-IN")} ·{" "}
                            {inv.paymentMethod}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatINR(inv.totalPaise)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
