import { formatINR } from "@/lib/finance/money";

export type InvoiceShareInput = {
  orgName: string;
  billNumber: string | null;
  customerName?: string | null;
  totalPaise: string | number | bigint;
  paymentMethod?: string | null;
  appUrl?: string;
};

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

export function shareInvoiceOnWhatsApp(message: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const base =
    digits.length >= 10
      ? `https://wa.me/${digits.startsWith("91") ? digits : `91${digits}`}`
      : "https://wa.me";
  const url = `${base}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens the browser print dialog — user can choose Save as PDF. */
export async function downloadInvoiceViaPrint(
  printFn: () => Promise<void>
): Promise<void> {
  await printFn();
}
