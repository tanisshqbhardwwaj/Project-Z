export type ShopDashboardPeriod = "today" | "week" | "month" | "date" | "range";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveShopDashboardBounds(
  period: ShopDashboardPeriod,
  dateStr?: string | null,
  range?: { from?: string | null; to?: string | null }
): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (period === "range" && range?.from && range?.to) {
    const [y1, m1, d1] = range.from.split("-").map(Number);
    const [y2, m2, d2] = range.to.split("-").map(Number);
    if (y1 && m1 && d1 && y2 && m2 && d2) {
      const start = startOfDay(new Date(y1, m1 - 1, d1));
      const end = endOfDay(new Date(y2, m2 - 1, d2));
      const label = `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
      return { start, end, label };
    }
  }

  if (period === "date" && dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y && m && d) {
      const start = startOfDay(new Date(y, m - 1, d));
      const end = endOfDay(new Date(y, m - 1, d));
      const label = start.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return { start, end, label };
    }
  }

  if (period === "week") {
    const start = startOfDay(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    const end = endOfDay(now);
    return { start, end, label: "This week" };
  }

  if (period === "month") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = endOfDay(now);
    return { start, end, label: "This month" };
  }

  const start = startOfDay(now);
  const end = endOfDay(now);
  return { start, end, label: "Today" };
}

export function parseShopDashboardPeriod(
  periodParam: string | null,
  dateParam: string | null,
  fromParam?: string | null,
  toParam?: string | null
): {
  period: ShopDashboardPeriod;
  date: string | null;
  from: string | null;
  to: string | null;
} {
  if (fromParam && toParam) {
    return { period: "range", date: null, from: fromParam, to: toParam };
  }
  if (periodParam === "range" && fromParam && toParam) {
    return { period: "range", date: null, from: fromParam, to: toParam };
  }
  if (periodParam === "month") return { period: "month", date: null, from: null, to: null };
  if (periodParam === "week") return { period: "week", date: null, from: null, to: null };
  if (periodParam === "date") {
    return {
      period: "date",
      date: dateParam?.trim() || new Date().toISOString().slice(0, 10),
      from: null,
      to: null,
    };
  }
  return { period: "today", date: null, from: null, to: null };
}
