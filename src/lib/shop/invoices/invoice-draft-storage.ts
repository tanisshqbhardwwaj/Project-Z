import type { SaleLine } from "@/lib/shop/invoices/invoice-cart";

export type InvoiceDraft = {
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  selectedCustomerId: string | null;
  salesBoyName: string;
  cart: SaleLine[];
  discountMode: "rupees" | "percent";
  discountRupees: string;
  discountPercent: string;
  taxRatePercent: string;
  taxIncluded: boolean;
  paymentMethod: string;
  paidRupees: string;
  cashReceivedRupees: string;
  selectedOfferId: string | null;
  offerSelectionSettled: boolean;
  savedAt: number;
};

const DRAFT_TTL_MS = 30 * 60 * 1000;

function draftKey(orgId: string) {
  return `shop-invoice-draft:${orgId}`;
}

export function loadInvoiceDraft(orgId: string): InvoiceDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(draftKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InvoiceDraft;
    if (!parsed?.cart?.length) return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      sessionStorage.removeItem(draftKey(orgId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveInvoiceDraft(orgId: string, draft: InvoiceDraft) {
  if (typeof window === "undefined") return;
  if (!draft.cart.length) {
    clearInvoiceDraft(orgId);
    return;
  }
  try {
    sessionStorage.setItem(draftKey(orgId), JSON.stringify(draft));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearInvoiceDraft(orgId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(draftKey(orgId));
  } catch {
    // Ignore.
  }
}
