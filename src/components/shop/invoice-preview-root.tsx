"use client";

import type { ReactNode } from "react";
import type { InvoicePaperSize } from "@/lib/org/shop-settings";
import {
  resolvePaperLayout,
  SHOP_INVOICE_PREVIEW_ID,
} from "@/lib/shop/print/invoice-print-layout";

type InvoicePreviewRootProps = {
  paperSize: InvoicePaperSize;
  printMarginMm?: number;
  children: ReactNode;
  className?: string;
};

/** Standard mount point for WYSIWYG invoice preview + print. */
export function InvoicePreviewRoot({
  paperSize,
  printMarginMm,
  children,
  className = "",
}: InvoicePreviewRootProps) {
  const layout = resolvePaperLayout(paperSize, printMarginMm);

  return (
    <div
      id={SHOP_INVOICE_PREVIEW_ID}
      className={`mx-auto box-border bg-white ${layout.tailwindWidthClass} ${className}`}
      style={{ width: layout.width, maxWidth: layout.width }}
    >
      {children}
    </div>
  );
}

export { SHOP_INVOICE_PREVIEW_ID };
