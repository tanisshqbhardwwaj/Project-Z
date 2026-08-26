"use client";

import { SHOP_INVOICE_PREVIEW_ID } from "@/lib/shop/print/invoice-print-layout";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_") || "invoice";
}

/** Rasterize the on-screen invoice preview into a PDF blob (thermal or A4 width). */
export async function generateInvoicePdfBlob(options?: {
  fileName?: string;
}): Promise<{ blob: Blob; fileName: string }> {
  const element = document.getElementById(SHOP_INVOICE_PREVIEW_ID);
  if (!element) {
    throw new Error("Invoice preview not found — refresh and try again");
  }

  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    skipAutoScale: true,
  });

  const pdfWidthMm = Math.max(58, Math.min(210, element.offsetWidth / 3.78));
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render invoice image"));
    img.src = dataUrl;
  });
  const pdfHeightMm = (img.height * pdfWidthMm) / img.width;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pdfWidthMm, pdfHeightMm],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");

  const fileName = `${sanitizeFileName(options?.fileName ?? "invoice")}.pdf`;
  const blob = pdf.output("blob");
  return { blob, fileName };
}
