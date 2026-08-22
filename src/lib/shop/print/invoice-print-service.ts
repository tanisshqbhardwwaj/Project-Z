"use client";

import type { InvoicePaperSize, ResolvedInvoiceTemplate } from "@/lib/org/shop-settings";
import {
  applyInvoicePrintVariables,
  clearInvoicePrintVariables,
  resolvePaperLayout,
  SHOP_INVOICE_PREVIEW_ID,
} from "@/lib/shop/print/invoice-print-layout";

export type InvoicePrintContext = {
  paperSize: InvoicePaperSize;
  printMarginMm?: number;
  template?: ResolvedInvoiceTemplate;
};

export type InvoicePrintCallbacks = {
  onComplete?: () => void;
};

export interface InvoicePrintAdapter {
  print(ctx: InvoicePrintContext, callbacks?: InvoicePrintCallbacks): Promise<void>;
}

function waitForPreviewPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 420);
      });
    });
  });
}

/** Prints the on-screen #shop-invoice-preview-content via native browser dialog. */
export class BrowserPrintAdapter implements InvoicePrintAdapter {
  async print(ctx: InvoicePrintContext, callbacks?: InvoicePrintCallbacks): Promise<void> {
    await waitForPreviewPaint();

    const source = document.getElementById(SHOP_INVOICE_PREVIEW_ID);
    if (!source) {
      callbacks?.onComplete?.();
      throw new Error("Invoice preview not found — refresh the page and try again");
    }

    const layout = resolvePaperLayout(ctx.paperSize, ctx.printMarginMm);
    applyInvoicePrintVariables(layout);
    document.body.classList.add("printing-shop-invoice");

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove("printing-shop-invoice");
      clearInvoicePrintVariables();
      callbacks?.onComplete?.();
    };

    const mq = window.matchMedia("print");
    const onPrintChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        mq.removeEventListener("change", onPrintChange);
        finish();
      }
    };
    mq.addEventListener("change", onPrintChange);

    const fallback = window.setTimeout(() => {
      mq.removeEventListener("change", onPrintChange);
      finish();
    }, 120_000);

    const cleanup = () => {
      window.clearTimeout(fallback);
      mq.removeEventListener("change", onPrintChange);
      finish();
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    window.print();
  }
}

/** Stub for future Windows direct/silent print service. */
export class DirectPrintAdapter implements InvoicePrintAdapter {
  async print(_ctx: InvoicePrintContext, callbacks?: InvoicePrintCallbacks): Promise<void> {
    callbacks?.onComplete?.();
    throw new Error(
      "Direct printing is not available yet. Use browser print or configure a print bridge later."
    );
  }
}

export type PrintAdapterMode = "browser" | "direct";

export function createInvoicePrintService(
  mode: PrintAdapterMode = "browser"
): InvoicePrintAdapter {
  if (mode === "direct") return new DirectPrintAdapter();
  return new BrowserPrintAdapter();
}

export function resolvePrintAdapterMode(): PrintAdapterMode {
  const env = process.env.NEXT_PUBLIC_PRINT_ADAPTER;
  return env === "direct" ? "direct" : "browser";
}

export async function printShopInvoice(
  ctx: InvoicePrintContext,
  callbacks?: InvoicePrintCallbacks
): Promise<void> {
  const service = createInvoicePrintService(resolvePrintAdapterMode());
  await service.print(ctx, callbacks);
}
