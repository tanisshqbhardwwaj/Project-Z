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
<<<<<<< HEAD
  /** Screen-only frame around thermal/A4 preview (hidden when printing). */
  framed?: boolean;
=======
>>>>>>> origin/master
};

/** Standard mount point for WYSIWYG invoice preview + print. */
export function InvoicePreviewRoot({
  paperSize,
  printMarginMm,
  children,
  className = "",
<<<<<<< HEAD
  framed = false,
=======
>>>>>>> origin/master
}: InvoicePreviewRootProps) {
  const layout = resolvePaperLayout(paperSize, printMarginMm);

  return (
    <div
      id={SHOP_INVOICE_PREVIEW_ID}
<<<<<<< HEAD
      className={`mx-auto box-border bg-white ${layout.tailwindWidthClass} ${
        framed
          ? "rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 print:shadow-none print:ring-0"
          : ""
      } ${className}`}
=======
      className={`mx-auto box-border bg-white ${layout.tailwindWidthClass} ${className}`}
>>>>>>> origin/master
      style={{ width: layout.width, maxWidth: layout.width }}
    >
      {children}
    </div>
  );
}

export { SHOP_INVOICE_PREVIEW_ID };
