export type InvoiceSort = "newest" | "oldest" | "amount-high" | "amount-low";

export type FilterableInvoice = {
  billNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  totalPaise: string;
  paymentMethod: string;
  createdAt: string;
};

export function filterSortInvoices<T extends FilterableInvoice>(
  invoices: T[],
  opts: { search: string; payment: string; sort: InvoiceSort }
): T[] {
  const q = opts.search.trim().toLowerCase();
  let list = invoices;

  if (q) {
    list = list.filter((inv) => {
      const haystack = [
        inv.billNumber,
        inv.customerName,
        inv.customerPhone,
        inv.paymentMethod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (opts.payment !== "all") {
    list = list.filter(
      (inv) => inv.paymentMethod.toLowerCase() === opts.payment.toLowerCase()
    );
  }

  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (opts.sort) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "amount-high":
        return Number(b.totalPaise) - Number(a.totalPaise);
      case "amount-low":
        return Number(a.totalPaise) - Number(b.totalPaise);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return sorted;
}
