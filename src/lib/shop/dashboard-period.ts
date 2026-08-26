export type ShopDashboardPeriod = "today" | "month" | "date";

export function resolveShopDashboardBounds(
  period: ShopDashboardPeriod,
  dateStr?: string | null
): { start: Date; end: Date; label: string } {
  const start = new Date();
  const end = new Date();

  if (period === "date" && dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y && m && d) {
      start.setFullYear(y, m - 1, d);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(y, m - 1, d);
      end.setHours(23, 59, 59, 999);
      const label = start.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return { start, end, label };
    }
  }

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "This month" };
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: "Today" };
}

export function parseShopDashboardPeriod(
  periodParam: string | null,
  dateParam: string | null
): { period: ShopDashboardPeriod; date: string | null } {
  if (periodParam === "month") return { period: "month", date: null };
  if (periodParam === "date") {
    return {
      period: "date",
      date: dateParam?.trim() || new Date().toISOString().slice(0, 10),
    };
  }
  return { period: "today", date: null };
}
