"use client";

import { SHOP_INVOICE_PREVIEW_ID } from "@/lib/shop/print/invoice-print-layout";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_") || "invoice";
}

function paperWidthMm(element: HTMLElement): number {
  const fromData = Number(element.dataset.paperWidthMm);
  if (Number.isFinite(fromData) && fromData > 0) return fromData;
  const px = element.offsetWidth;
  return Math.max(58, Math.min(210, px / 3.78));
}

/** Clone preview on-screen — mobile layout hides the live node at left:-9999px. */
async function rasterizeInvoicePreview(element: HTMLElement): Promise<{
  dataUrl: string;
  widthMm: number;
  heightPx: number;
  widthPx: number;
}> {
  const widthMm = paperWidthMm(element);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = `${SHOP_INVOICE_PREVIEW_ID}-pdf-clone`;
  clone.style.position = "fixed";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.zIndex = "2147483647";
  clone.style.background = "#ffffff";
  clone.style.width = `${widthMm}mm`;
  clone.style.maxWidth = `${widthMm}mm`;
  clone.style.boxSizing = "border-box";
  document.body.appendChild(clone);

  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const { toPng } = await import("html-to-image");
    const widthPx = clone.offsetWidth;
    const heightPx = clone.scrollHeight;
    const dataUrl = await toPng(clone, {
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      width: widthPx,
      height: heightPx,
    });
    return { dataUrl, widthMm, heightPx, widthPx };
  } finally {
    clone.remove();
  }
}

/** Rasterize the on-screen invoice preview into a PDF blob (thermal or A4 width). */
export async function generateInvoicePdfBlob(options?: {
  fileName?: string;
}): Promise<{ blob: Blob; fileName: string }> {
  const element = document.getElementById(SHOP_INVOICE_PREVIEW_ID);
  if (!element) {
    throw new Error("Invoice preview not found — refresh and try again");
  }

  const { jsPDF } = await import("jspdf");
  const { dataUrl, widthMm } = await rasterizeInvoicePreview(element);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render invoice image"));
    img.src = dataUrl;
  });
  const pdfHeightMm = (img.height * widthMm) / img.width;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, pdfHeightMm],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, widthMm, pdfHeightMm, undefined, "FAST");

  const fileName = `${sanitizeFileName(options?.fileName ?? "invoice")}.pdf`;
  const blob = pdf.output("blob");
  return { blob, fileName };
}
