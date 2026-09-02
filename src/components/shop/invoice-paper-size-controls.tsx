"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  defaultPrintMarginForPaper,
  type InvoicePaperSize,
} from "@/lib/org/shop-settings";
import { paperSizeLabel } from "@/lib/shop/print/invoice-print-layout";

const PAPER_OPTIONS: Array<{ value: InvoicePaperSize; label: string }> = [
  { value: "58mm", label: "58mm" },
  { value: "80mm", label: "80mm" },
  { value: "A4", label: "A4" },
];

type InvoicePaperSizeControlsProps = {
  paperSize: InvoicePaperSize;
  printMarginMm: number;
  onPaperSizeChange: (size: InvoicePaperSize) => void;
  onPrintMarginChange: (mm: number) => void;
  className?: string;
  compact?: boolean;
};

export function InvoicePaperSizeControls({
  paperSize,
  printMarginMm,
  onPaperSizeChange,
  onPrintMarginChange,
  className,
  compact = false,
}: InvoicePaperSizeControlsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <Label className={compact ? "text-[10px] uppercase tracking-wide text-muted-foreground" : "text-xs"}>
          Page size
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {PAPER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onPaperSizeChange(option.value);
                onPrintMarginChange(defaultPrintMarginForPaper(option.value));
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                paperSize === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
              aria-pressed={paperSize === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Preview and print use {paperSizeLabel(paperSize)}. Change here without editing shop settings.
        </p>
      </div>
      {!compact ? (
        <div className="space-y-1.5">
          <Label htmlFor="invoice-print-margin" className="text-xs">
            Print margin (mm)
          </Label>
          <Input
            id="invoice-print-margin"
            type="number"
            min={0}
            max={30}
            step={1}
            value={printMarginMm}
            onChange={(e) => onPrintMarginChange(Math.max(0, Number(e.target.value) || 0))}
            className="h-9 max-w-[120px] rounded-lg"
          />
        </div>
      ) : null}
    </div>
  );
}
