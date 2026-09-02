import { describe, it, expect } from "vitest";
import {
  evaluateSingleOffer,
  evaluateSingleOfferLineDiscounts,
  type ActiveOffer,
} from "@/lib/shop/offers/offer-engine";

const productOffer = (overrides: Partial<ActiveOffer> = {}): ActiveOffer => ({
  id: "offer-1",
  name: "Jeans offer",
  discountType: "PRODUCT_PERCENT",
  discountValue: 20,
  productIds: ["jeans-id"],
  categoryKeys: [],
  minQuantity: null,
  minPurchasePaise: null,
  buyQuantity: null,
  getQuantity: null,
  priority: 0,
  ...overrides,
});

describe("evaluateSingleOfferLineDiscounts", () => {
  it("applies product offer only on matching lines", () => {
    const items = [
      { name: "Jeans", qty: 1, priceRupees: 800, inventoryItemId: "jeans-id" },
      { name: "Jacket", qty: 1, priceRupees: 1500, inventoryItemId: "jacket-id" },
    ];
    const lines = evaluateSingleOfferLineDiscounts(productOffer(), items);
    expect(lines[0]).toBe(160);
    expect(lines[1]).toBe(0);
    expect(evaluateSingleOffer(productOffer(), items)).toBe(160);
  });
});
