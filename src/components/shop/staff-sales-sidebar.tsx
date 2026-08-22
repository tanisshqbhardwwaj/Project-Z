"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";

type DashboardPeriod = "today" | "month";

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
  periodLabel: string;
  staffList: StaffSummary[];
  selectedStaff: string | null;
  onClose: () => void;
  onSelectStaff: (name: string | null) => void;
};

export function StaffSalesSidebar({
  open,
  period,
  periodLabel,
  staffList,
  selectedStaff,
  onClose,
  onSelectStaff,
}: StaffSalesSidebarProps) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  const detailQuery = useQuery({
    queryKey:
      orgId && selectedStaff
        ? queryKeys.modules.shop.staffInvoices(orgId, period, selectedStaff)
        : ["disabled"],
    queryFn: () =>
      apiFetch<StaffInvoicesData>(
        `/api/v1/shop/dashboard/staff-invoices?period=${period}&staffName=${encodeURIComponent(selectedStaff!)}`
      ),
    enabled: open && !!orgId && !!selectedStaff,
  });

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
              onClick={() => onSelectStaff(null)}
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
            <ul className="divide-y">
              {staffList.map((staff) => (
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
          ) : detailQuery.isLoading ? (
            <PageLoader label="Loading invoices…" />
          ) : detailQuery.error ? (
            <p className="p-4 text-sm text-destructive">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Failed to load invoices"}
            </p>
          ) : (detailQuery.data?.invoices.length ?? 0) === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No invoices found.</p>
          ) : (
            <ul className="divide-y">
              {detailQuery.data!.invoices.map((inv) => (
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
        </div>
      </aside>
    </>
  );
}
