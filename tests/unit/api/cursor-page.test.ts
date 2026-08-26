import { describe, expect, it } from "vitest";
import { flattenCursorPages, toCursorPage } from "@/lib/api/cursor-page";

describe("cursor-page", () => {
  it("builds hasMore when extra row exists", () => {
    const page = toCursorPage(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      2
    );
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("b");
  });

  it("deduplicates flattened pages by id", () => {
    const rows = flattenCursorPages([
      { items: [{ id: "1" }, { id: "2" }], nextCursor: "2", hasMore: true },
      { items: [{ id: "2" }, { id: "3" }], nextCursor: null, hasMore: false },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });
});
