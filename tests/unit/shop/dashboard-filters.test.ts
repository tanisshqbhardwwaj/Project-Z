import { describe, expect, it } from "vitest";
import {
  parseShopDashboardPeriod,
  resolveShopDashboardBounds,
} from "@/lib/shop/dashboard-period";
import { filterSortInvoices } from "@/lib/shop/invoice-list-filters";

describe("resolveShopDashboardBounds", () => {
  it("returns today bounds", () => {
    const { start, end, label } = resolveShopDashboardBounds("today");
    expect(label).toBe("Today");
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
  });

  it("returns exact date bounds", () => {
    const { start, end, label } = resolveShopDashboardBounds("date", "2026-08-15");
    expect(label).toContain("15");
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
  });
});

describe("parseShopDashboardPeriod", () => {
  it("defaults to today", () => {
    expect(parseShopDashboardPeriod(null, null)).toEqual({
      period: "today",
      date: null,
    });
  });

  it("parses date period with fallback", () => {
    const parsed = parseShopDashboardPeriod("date", null);
    expect(parsed.period).toBe("date");
    expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("filterSortInvoices", () => {
  const invoices = [
    {
      id: "1",
      billNumber: "A-100",
      customerName: "Ravi",
      customerPhone: "9999999999",
      totalPaise: "50000",
      paymentMethod: "CASH",
      createdAt: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "2",
      billNumber: "B-200",
      customerName: "Priya",
      customerPhone: "8888888888",
      totalPaise: "100000",
      paymentMethod: "UPI",
      createdAt: "2026-08-02T10:00:00.000Z",
    },
  ];

  it("filters by search and payment", () => {
    const result = filterSortInvoices(invoices, {
      search: "ravi",
      payment: "CASH",
      sort: "newest",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("sorts by amount high to low", () => {
    const result = filterSortInvoices(invoices, {
      search: "",
      payment: "all",
      sort: "amount-high",
    });
    expect(result[0].id).toBe("2");
  });
});
