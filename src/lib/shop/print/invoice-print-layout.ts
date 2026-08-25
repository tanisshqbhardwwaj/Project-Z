import type { InvoicePaperSize } from "@/lib/org/shop-settings";
import { defaultPrintMarginForPaper } from "@/lib/org/shop-settings";

export const SHOP_INVOICE_PREVIEW_ID = "shop-invoice-preview-content";

export type PaperLayout = {
  paperSize: InvoicePaperSize;
  width: string;
  pageSize: string;
  marginMm: number;
  compact: boolean;
  tailwindWidthClass: string;
  barcodeHeight: number;
};

export function resolvePaperLayout(
  paperSize: InvoicePaperSize,
  marginMm?: number
): PaperLayout {
  const margin = marginMm ?? defaultPrintMarginForPaper(paperSize);

  switch (paperSize) {
    case "58mm":
      return {
        paperSize,
        width: "58mm",
        pageSize: "58mm auto",
        marginMm: margin,
        compact: true,
        tailwindWidthClass: "w-[58mm] max-w-[58mm]",
        barcodeHeight: 28,
      };
    case "A4":
      return {
        paperSize,
        width: "210mm",
        pageSize: "A4 portrait",
        marginMm: margin,
        compact: false,
        tailwindWidthClass: "w-full max-w-[210mm]",
        barcodeHeight: 40,
      };
    case "80mm":
    default:
      return {
        paperSize: "80mm",
        width: "80mm",
        pageSize: "80mm auto",
        marginMm: margin,
        compact: true,
        tailwindWidthClass: "w-[80mm] max-w-[80mm]",
        barcodeHeight: 32,
      };
  }
}

/** Apply CSS variables used by invoice-print.css before printing. */
export function applyInvoicePrintVariables(layout: PaperLayout): void {
  const root = document.documentElement;
  root.style.setProperty("--invoice-paper-width", layout.width);
  root.style.setProperty("--invoice-page-size", layout.pageSize);
  root.style.setProperty("--invoice-page-margin", `${layout.marginMm}mm`);
}

export function clearInvoicePrintVariables(): void {
  const root = document.documentElement;
  root.style.removeProperty("--invoice-paper-width");
  root.style.removeProperty("--invoice-page-size");
  root.style.removeProperty("--invoice-page-margin");
}

export function paperSizeLabel(paperSize: InvoicePaperSize): string {
  switch (paperSize) {
    case "58mm":
      return "58mm thermal";
    case "A4":
      return "A4";
    default:
      return "80mm thermal";
  }
}
