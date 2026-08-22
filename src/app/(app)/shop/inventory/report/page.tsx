"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/finance/money";
import { isInfiniteStock } from "@/lib/shop/inventory";
import {
  inventoryCategoryLabel,
  inventorySubcategoryLabel,
  parseInventoryCategory,
  parseInventorySubcategory,
} from "@/lib/shop/inventory-categories";

type ReportItem = {
  id: string;
  name: string;
  size: string | null;
  barcode: string | null;
  quantity: number;
  reorderLevel: number;
  sellPaise: string | null;
  expiryDate: string | null;
  sectorMeta?: unknown;
};

function formatExpiry(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InventoryReportPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, activeShopSector, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const title = moduleLabel("shop_inventory", activeBusinessType ?? "SHOPKEEPER");

  const itemsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<ReportItem[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && moduleEnabled,
  });

  const rows = useMemo(() => {
    const items = itemsQuery.data ?? [];
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsQuery.data]);

  const totals = useMemo(() => {
    let skus = 0;
    let units = 0;
    let low = 0;
    for (const item of rows) {
      skus++;
      if (!isInfiniteStock(item.quantity)) {
        units += item.quantity;
        if (item.quantity <= item.reorderLevel) low++;
      }
    }
    return { skus, units, low };
  }, [rows]);

  if (!moduleEnabled) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="text-muted-foreground">{title} module is not enabled.</p>
        <Link href="/shop/inventory" className="mt-4 inline-block text-primary underline">
          Back to inventory
        </Link>
      </div>
    );
  }

  if (itemsQuery.isLoading) {
    return <PageLoader label="Loading stock report…" />;
  }

  if (itemsQuery.error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <p className="text-destructive">
          {itemsQuery.error instanceof Error
            ? itemsQuery.error.message
            : "Failed to load stock report"}
        </p>
        <Link href="/shop/inventory">
          <Button variant="outline" className="rounded-xl">Back to inventory</Button>
        </Link>
      </div>
    );
  }

  const printedAt = new Date().toLocaleString("en-IN");

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-10 print:max-w-none print:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/shop/inventory">
            <Button variant="outline" size="sm" className="rounded-xl">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Inventory
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Stock report</h1>
        </div>
        <Button className="rounded-xl" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print report
        </Button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-lg font-bold">Stock report</h1>
        <p className="text-xs text-muted-foreground">Printed {printedAt}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm print:gap-2">
        <div className="rounded-xl border p-3 print:rounded-none print:border-gray-300">
          <p className="text-xs text-muted-foreground">SKUs</p>
          <p className="text-lg font-bold tabular-nums">{totals.skus}</p>
        </div>
        <div className="rounded-xl border p-3 print:rounded-none print:border-gray-300">
          <p className="text-xs text-muted-foreground">Total units</p>
          <p className="text-lg font-bold tabular-nums">{totals.units}</p>
        </div>
        <div className="rounded-xl border p-3 print:rounded-none print:border-gray-300">
          <p className="text-xs text-muted-foreground">Low stock</p>
          <p className="text-lg font-bold tabular-nums text-destructive">{totals.low}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border print:rounded-none print:border-gray-300">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs print:bg-gray-100">
              <th className="p-2 font-medium">Product</th>
              <th className="p-2 font-medium">Category</th>
              <th className="hidden p-2 font-medium sm:table-cell">Barcode</th>
              <th className="p-2 font-medium text-right">Qty</th>
              <th className="p-2 font-medium text-right">Reorder</th>
              <th className="p-2 font-medium text-right">Price</th>
              <th className="hidden p-2 font-medium md:table-cell">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const category = parseInventoryCategory(item.sectorMeta);
              const subCategory = parseInventorySubcategory(item.sectorMeta);
              const low =
                !isInfiniteStock(item.quantity) && item.quantity <= item.reorderLevel;
              return (
                <tr
                  key={item.id}
                  className={`border-t ${low ? "bg-destructive/[0.04] print:bg-transparent" : ""}`}
                >
                  <td className="p-2 align-top">
                    <p className="font-medium">{item.name}</p>
                    {item.size ? (
                      <p className="text-xs text-muted-foreground">Size {item.size}</p>
                    ) : null}
                  </td>
                  <td className="p-2 align-top text-xs">
                    {category
                      ? inventoryCategoryLabel(activeShopSector, category)
                      : "—"}
                    {subCategory ? (
                      <span className="block text-muted-foreground">
                        {inventorySubcategoryLabel(
                          activeShopSector,
                          category,
                          subCategory
                        )}
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden p-2 align-top font-mono text-xs sm:table-cell">
                    {item.barcode ?? "—"}
                  </td>
                  <td className="p-2 align-top text-right tabular-nums">
                    {isInfiniteStock(item.quantity) ? "∞" : item.quantity}
                    {low ? (
                      <span className="ml-1 text-[10px] font-semibold text-destructive">
                        LOW
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                    {item.reorderLevel}
                  </td>
                  <td className="p-2 align-top text-right tabular-nums">
                    {item.sellPaise ? formatINR(item.sellPaise) : "—"}
                  </td>
                  <td className="hidden p-2 align-top text-xs md:table-cell">
                    {formatExpiry(item.expiryDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground print:text-[10px]">
        {rows.length} line{rows.length === 1 ? "" : "s"} · Use A4 paper, turn off headers/footers
        in print settings.
      </p>

      <style jsx global>{`
        @media print {
          nav,
          header,
          aside,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}
