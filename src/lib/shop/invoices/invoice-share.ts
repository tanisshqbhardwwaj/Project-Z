import { formatINR } from "@/lib/finance/money";

export type InvoiceShareInput = {
  orgName: string;
  billNumber: string | null;
  customerName?: string | null;
  totalPaise: string | number | bigint;
  paymentMethod?: string | null;
  appUrl?: string;
};

export type InvoiceWhatsAppShareResult = "direct" | "shared" | "downloaded";

/** E.164-ish digits for wa.me (India default +91 when 10 digits). */
export function normalizeWhatsAppPhone(phone?: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length >= 12) return digits;
  return digits;
}

export function hasWhatsAppPhone(phone?: string | null): boolean {
  return normalizeWhatsAppPhone(phone) != null;
}

export function buildInvoiceWhatsAppMessage(input: InvoiceShareInput): string {
  const bill = input.billNumber?.trim() || "Invoice";
  const total = formatINR(input.totalPaise);
  const customer = input.customerName?.trim();
  const lines = [
    `*${input.orgName}*`,
    `Bill #${bill}`,
    customer ? `Customer: ${customer}` : null,
    `Total: ${total}`,
    input.paymentMethod ? `Payment: ${input.paymentMethod.replace("_", " ")}` : null,
    "",
    "Thank you for your purchase!",
  ].filter(Boolean);
  if (input.appUrl) {
    lines.push("", input.appUrl);
  }
  return lines.join("\n");
}

export function shareInvoiceOnWhatsApp(
  message: string,
  phone?: string | null,
  options?: { directToContact?: boolean }
) {
  const normalized = normalizeWhatsAppPhone(phone);
  const base = normalized ? `https://wa.me/${normalized}` : "https://wa.me";
  const url = `${base}?text=${encodeURIComponent(message)}`;
  if (options?.directToContact || normalized) {
    window.location.assign(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function triggerPdfDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Share invoice text + PDF.
 * - Customer phone on file → PDF downloads, WhatsApp opens straight to that chat.
 * - No phone → native share sheet when supported, else PDF + generic WhatsApp.
 */
export async function shareInvoiceOnWhatsAppWithPdf(input: {
  message: string;
  phone?: string | null;
  pdfBlob: Blob;
  fileName: string;
}): Promise<InvoiceWhatsAppShareResult> {
  const customerPhone = normalizeWhatsAppPhone(input.phone);

  if (customerPhone) {
    triggerPdfDownload(input.pdfBlob, input.fileName);
    shareInvoiceOnWhatsApp(
      `${input.message}\n\n📎 Invoice PDF (${input.fileName}) — please attach it here.`,
      customerPhone,
      { directToContact: true }
    );
    return "direct";
  }

  const file = new File([input.pdfBlob], input.fileName, { type: "application/pdf" });
  const sharePayload = { text: input.message, files: [file] };

  if (typeof navigator !== "undefined" && navigator.canShare?.(sharePayload)) {
    await navigator.share(sharePayload);
    return "shared";
  }

  triggerPdfDownload(input.pdfBlob, input.fileName);
  shareInvoiceOnWhatsApp(
    `${input.message}\n\n📎 Invoice PDF saved (${input.fileName}). Please attach it in WhatsApp.`,
    null
  );
  return "downloaded";
}

/** Opens the browser print dialog — user can choose Save as PDF. */
export async function downloadInvoiceViaPrint(
  printFn: () => Promise<void>
): Promise<void> {
  await printFn();
}
