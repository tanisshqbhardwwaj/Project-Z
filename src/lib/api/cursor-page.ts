/** Standard cursor page returned by list APIs. */
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function emptyCursorPage<T>(): CursorPage<T> {
  return { items: [], nextCursor: null, hasMore: false };
}

/** Build a cursor page from rows fetched with limit + 1. */
export function toCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  getCursor: (item: T) => string = (item) => item.id
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? getCursor(last) : null,
    hasMore,
  };
}

/** Flatten infinite-query pages and deduplicate by record id. */
export function flattenCursorPages<T extends { id: string }>(
  pages: CursorPage<T>[] | undefined
): T[] {
  if (!pages?.length) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
