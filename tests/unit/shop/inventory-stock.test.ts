import { describe, expect, it } from "vitest";
import {
  availableQtyForInventoryLine,
  validateCartStock,
} from "@/lib/shop/inventory";

describe("cart stock validation", () => {
  const inventory = [
    { id: "jeans-28", quantity: 10, unit: "pcs", name: "Jeans Size 28" },
    { id: "jacket", quantity: 0, unit: "pcs", name: "Jacket" },
  ];

  it("caps qty increases using stock minus other cart lines", () => {
    const cart = [
      { id: "a", inventoryItemId: "jeans-28", qty: 8, name: "Jeans" },
      { id: "b", inventoryItemId: "jeans-28", qty: 1, name: "Jeans" },
    ];
    expect(
      availableQtyForInventoryLine("jeans-28", cart, inventory, "a")
    ).toBe(9);
  });

  it("rejects cart totals above on-hand stock", () => {
    const result = validateCartStock(
      [{ inventoryItemId: "jeans-28", qty: 100, name: "Jeans" }],
      inventory
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Only 10/);
    }
  });

  it("rejects zero-stock items", () => {
    const result = validateCartStock(
      [{ inventoryItemId: "jacket", qty: 1, name: "Jacket" }],
      inventory
    );
    expect(result.ok).toBe(false);
  });
});
