"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export type OpsDataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
  searchable?: (row: T) => string;
};

export function OpsDataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  className,
  toolbar,
}: {
  rows: T[];
  columns: OpsDataTableColumn<T>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  toolbar?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        if (!col.searchable) return false;
        return col.searchable(row).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, query]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-xl pl-9"
          />
        </div>
        {toolbar}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={cn("px-4 py-3 font-medium", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/20"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3 align-top", col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
