"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Printer } from "lucide-react";
import type { LabelSize } from "@/lib/org/shop-settings";
import type { BarcodeLabelData } from "@/components/shop/barcode-label";
import { downloadLabelSheet, printLabelSheet } from "@/lib/shop/label-sheet";

type LabelCopiesActionsProps = {
  size: LabelSize;
  data: BarcodeLabelData;
  copies: number;
  onCopiesChange: (copies: number) => void;
};

export function clampLabelCopies(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), 500);
}

export function LabelCopiesActions({
  size,
  data,
  copies,
  onCopiesChange,
}: LabelCopiesActionsProps) {
  const [printError, setPrintError] = useState<string | null>(null);

  function handleDownload() {
    downloadLabelSheet(size, data, copies);
  }

  function handlePrint() {
    setPrintError(null);
    try {
      printLabelSheet(size, data, copies);
    } catch {
      setPrintError("Allow pop-ups in your browser, then tap Print again.");
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="space-y-2">
        <Label htmlFor="label-copies">Number of copies</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="label-copies"
            type="number"
            min={1}
            max={500}
            value={String(copies)}
            onChange={(e) => onCopiesChange(clampLabelCopies(Number(e.target.value)))}
            className="h-11 w-24 rounded-xl"
          />
          {[1, 5, 10, 20, 50].map((n) => (
            <Button
              key={n}
              type="button"
              variant={copies === n ? "default" : "outline"}
              size="sm"
              className="rounded-xl px-3"
              onClick={() => onCopiesChange(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="rounded-xl" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download {copies}
        </Button>
        <Button className="rounded-xl" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print {copies}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Opens a label-only print page. Turn off <strong>Headers and footers</strong> in the
        print dialog.
      </p>
      {printError ? (
        <p className="text-xs text-destructive">{printError}</p>
      ) : null}
    </div>
  );
}
