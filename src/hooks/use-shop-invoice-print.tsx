"use client";

import { useCallback, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { printShopInvoice } from "@/lib/shop/print/invoice-print-service";
import type { CashTender } from "@/lib/shop/invoice-receipt-print";
import { paperSizeLabel } from "@/lib/shop/print/invoice-print-layout";

export type { CashTender };

type UseShopInvoicePrintOptions = {
  /** Called after the user closes the print dialog (or cancels). */
  onComplete?: () => void;
};

export function useShopInvoicePrint(options: UseShopInvoicePrintOptions = {}) {
  const { onComplete } = options;
  const template = useShopInvoiceTemplate();
  const [printing, setPrinting] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const printInvoice = useCallback(async () => {
    setPrinting(true);
    try {
      await printShopInvoice(
        {
          paperSize: template.paperSize,
          printMarginMm: template.printMarginMm,
          template,
        },
        {
          onComplete: () => {
            setPrinting(false);
            onCompleteRef.current?.();
          },
        }
      );
    } catch {
      setPrinting(false);
      onCompleteRef.current?.();
    }
  }, [template]);

  function PrintLayer() {
    if (!printing) return null;
    return (
      <div
        className="print-hidden fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-10 py-8 shadow-xl">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Printer className="relative h-8 w-8 animate-pulse text-primary" />
          </div>
          <p className="text-base font-semibold">Printing bill…</p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Paper: {paperSizeLabel(template.paperSize)} — printing exactly what you see in the
            preview. Select your printer once; Chrome usually remembers it.
            {template.defaultCopies > 1
              ? ` Suggested copies: ${template.defaultCopies}.`
              : null}
          </p>
        </div>
      </div>
    );
  }

  return { printInvoice, printing, PrintLayer };
}
