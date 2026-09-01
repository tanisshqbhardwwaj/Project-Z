"use client";

import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Minus, Plus } from "lucide-react";
import type { SaleLine } from "@/lib/shop/invoices/invoice-cart";
import { lineTotal } from "@/lib/shop/invoices/invoice-cart";
import { variantSubtitle } from "@/lib/shop/inventory/variant-display";
import {
  formatInvoiceMoney,
  formatLineDiscountHint,
  type AllocatedLineDiscount,
} from "@/lib/shop/invoices/invoice-pricing";
import type { ResolvedInvoiceTemplate } from "@/lib/org/shop-settings";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Button } from "@/components/ui/button";

const VIRTUALIZE_THRESHOLD = 15;
const ROW_HEIGHT_ESTIMATE = 72;

export type InvoiceCartTableProps = {
  cart: SaleLine[];
  cartLineAllocations: AllocatedLineDiscount[] | null;
  invoiceTemplate: ResolvedInvoiceTemplate;
  showLineStaff: boolean;
  staffOptions: { id: string; name: string }[];
  onQtyDelta: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onStaffChange: (lineId: string, staffId: string) => void;
};

function CartRow({
  line,
  allocated,
  invoiceTemplate,
  showLineStaff,
  staffOptions,
  onQtyDelta,
  onRemove,
  onStaffChange,
}: {
  line: SaleLine;
  allocated: AllocatedLineDiscount | null | undefined;
  invoiceTemplate: ResolvedInvoiceTemplate;
  showLineStaff: boolean;
  staffOptions: { id: string; name: string }[];
  onQtyDelta: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onStaffChange: (lineId: string, staffId: string) => void;
}) {
  const hasLineDiscount = allocated != null && allocated.lineDiscountRupees > 0.004;
  const unitRate = line.priceRupees;
  const listAmount = lineTotal(line);
  const amount = hasLineDiscount ? allocated.discountedLineRupees : listAmount;
  const hint = hasLineDiscount ? formatLineDiscountHint(allocated, invoiceTemplate) : null;
  const fmt = (n: number) => formatInvoiceMoney(n, invoiceTemplate);
  const subtitle = variantSubtitle(line);

  return (
    <>
      <td className="px-3 py-2.5">
        <span className="block font-medium leading-snug">{line.name}</span>
        {subtitle ? (
          <span className="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {subtitle}
          </span>
        ) : null}
        {hint ? (
          <span className="mt-1 block text-xs font-medium text-emerald-700">{hint}</span>
        ) : null}
      </td>
      {showLineStaff ? (
        <td className="px-2 py-2.5">
          <select
            value={line.staffId ?? ""}
            onChange={(e) => onStaffChange(line.id, e.target.value)}
            className="h-8 max-w-[8rem] rounded-md border bg-background px-1.5 text-xs"
          >
            <option value="">—</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.split(" ")[0]}
              </option>
            ))}
          </select>
        </td>
      ) : null}
      <td className="px-2 py-2.5">
        <div className="mx-auto flex w-fit items-center rounded-lg border bg-background">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-none rounded-l-lg p-0 min-h-0"
            onClick={() => onQtyDelta(line.id, -1)}
            aria-label={`Decrease ${line.name} quantity`}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[2.5rem] border-x px-2 text-center text-sm font-semibold tabular-nums">
            {line.qty}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-none rounded-r-lg p-0 min-h-0"
            onClick={() => onQtyDelta(line.id, 1)}
            aria-label={`Increase ${line.name} quantity`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(unitRate)}</td>
      <td className="px-3 py-2.5 text-right">
        {hasLineDiscount ? (
          <div className="tabular-nums">
            <span className="block text-xs text-muted-foreground line-through">{fmt(listAmount)}</span>
            <span className="block font-semibold">{fmt(amount)}</span>
          </div>
        ) : (
          <span className="font-semibold tabular-nums">{fmt(amount)}</span>
        )}
      </td>
      <td className="px-1 py-2.5">
        <DeleteIconButton
          variant="ghost"
          onClick={() => onRemove(line.id)}
          aria-label={`Remove ${line.name}`}
        />
      </td>
    </>
  );
}

/** Memoized cart table — virtualized when the cart is large. */
export const InvoiceCartTable = memo(function InvoiceCartTable({
  cart,
  cartLineAllocations,
  invoiceTemplate,
  showLineStaff,
  staffOptions,
  onQtyDelta,
  onRemove,
  onStaffChange,
}: InvoiceCartTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualize = cart.length >= VIRTUALIZE_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: cart.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 6,
    enabled: virtualize,
  });

  const colSpan = showLineStaff ? 6 : 5;
  const virtualItems = virtualize ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div
      ref={scrollRef}
      className={
        virtualize
          ? "max-h-[min(420px,50vh)] overflow-auto rounded-lg border"
          : "overflow-x-auto rounded-lg border"
      }
    >
      <table className="w-full min-w-[320px] text-sm">
        <thead className={virtualize ? "sticky top-0 z-10 bg-background" : undefined}>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Item</th>
            {showLineStaff ? <th className="px-2 py-2.5 font-medium">Staff</th> : null}
            <th className="px-2 py-2.5 text-center font-medium">Qty</th>
            <th className="px-3 py-2.5 text-right font-medium">Rate</th>
            <th className="px-3 py-2.5 text-right font-medium">Amount</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody>
          {virtualize && paddingTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          ) : null}
          {(virtualize ? virtualItems : cart.map((_, index) => ({ index }))).map((entry) => {
            const idx = entry.index;
            const line = cart[idx];
            return (
              <tr key={line.id} className="border-b last:border-0 hover:bg-muted/20">
                <CartRow
                  line={line}
                  allocated={cartLineAllocations?.[idx]}
                  invoiceTemplate={invoiceTemplate}
                  showLineStaff={showLineStaff}
                  staffOptions={staffOptions}
                  onQtyDelta={onQtyDelta}
                  onRemove={onRemove}
                  onStaffChange={onStaffChange}
                />
              </tr>
            );
          })}
          {virtualize && paddingBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
});
