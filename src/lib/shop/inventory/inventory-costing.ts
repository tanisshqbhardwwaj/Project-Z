import { isInfiniteStock } from "@/lib/shop/inventory/inventory";

/** Weighted average cost when receiving stock at a new rate. */
export function computeWeightedAverageCostPaise(input: {
  currentQty: number;
  currentCostPaise: bigint | null;
  addQty: number;
  purchaseRatePaise: bigint;
}): bigint {
  const { currentQty, addQty, purchaseRatePaise } = input;
  if (addQty <= 0) {
    return input.currentCostPaise ?? purchaseRatePaise;
  }
  if (isInfiniteStock(currentQty) || currentQty <= 0) {
    return purchaseRatePaise;
  }
  const currentCost = input.currentCostPaise ?? BigInt(0);
  const totalValue =
    BigInt(Math.round(currentQty)) * currentCost +
    BigInt(Math.round(addQty)) * purchaseRatePaise;
  const totalQty = Math.round(currentQty + addQty);
  if (totalQty <= 0) return purchaseRatePaise;
  return totalValue / BigInt(totalQty);
}

/** Reverse weighted average when removing purchased qty (edit/cancel purchase). */
export function reverseWeightedAverageCostPaise(input: {
  currentQty: number;
  currentCostPaise: bigint | null;
  removeQty: number;
  removedRatePaise: bigint;
}): bigint | null {
  const { currentQty, removeQty, removedRatePaise } = input;
  if (isInfiniteStock(currentQty) || removeQty <= 0) {
    return input.currentCostPaise;
  }
  const newQty = currentQty - removeQty;
  if (newQty <= 0) return null;
  const currentCost = input.currentCostPaise ?? removedRatePaise;
  const totalValue =
    BigInt(Math.round(currentQty)) * currentCost -
    BigInt(Math.round(removeQty)) * removedRatePaise;
  if (totalValue <= BigInt(0)) return removedRatePaise;
  return totalValue / BigInt(Math.round(newQty));
}

export function lineCostPaise(costPaisePerUnit: bigint, qty: number): bigint {
  return costPaisePerUnit * BigInt(Math.max(0, Math.round(qty)));
}
