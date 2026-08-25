import type { OfferDiscountType } from "@prisma/client";

export type OfferCartLine = {
  inventoryItemId?: string;
  name: string;
  qty: number;
  priceRupees: number;
  categoryKey?: string | null;
};

export type ActiveOffer = {
  id: string;
  name: string;
  discountType: OfferDiscountType;
  discountValue: number;
  productIds: string[];
  categoryKeys: string[];
  minQuantity: number | null;
  minPurchasePaise: bigint | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  priority: number;
};

export type ApplicableOfferOption = {
  offerId: string;
  name: string;
  discountRupees: number;
  priority: number;
};

export type OfferPreviewResult = {
  applicableOffers: ApplicableOfferOption[];
  selectedOfferId: string | null;
  requiresSelection: boolean;
  offerDiscountRupees: number;
  offerDetails: { offerId: string; name: string; discountRupees: number }[];
  /** Per cart line — discount from the selected offer only. */
  lineDiscountRupees?: number[];
};

function parseJsonStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function mapDbOffer(o: {
  id: string;
  name: string;
  discountType: OfferDiscountType;
  discountValue: number;
  productIdsJson: unknown;
  categoryKeysJson: unknown;
  minQuantity: number | null;
  minPurchasePaise: bigint | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  priority: number;
}): ActiveOffer {
  return {
    id: o.id,
    name: o.name,
    discountType: o.discountType,
    discountValue: o.discountValue,
    productIds: parseJsonStringArray(o.productIdsJson),
    categoryKeys: parseJsonStringArray(o.categoryKeysJson),
    minQuantity: o.minQuantity,
    minPurchasePaise: o.minPurchasePaise,
    buyQuantity: o.buyQuantity,
    getQuantity: o.getQuantity,
    priority: o.priority,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function cartSubtotal(items: OfferCartLine[]) {
  return items.reduce((s, l) => s + l.qty * l.priceRupees, 0);
}

function isBogo(type: OfferDiscountType) {
  return type === "BUY_X_GET_Y" || type === "BUY_X_GET_X";
}

/**
 * Free-unit count for a "buy X get Y" deal: the customer must pay for X and take Y,
 * so a full group is X + Y units. Buy 1 get 1 on a single unit earns nothing.
 */
function bogoFreeUnits(qty: number, buyQuantity: number, getQuantity: number) {
  const groupSize = buyQuantity + getQuantity;
  if (groupSize <= 0) return 0;
  const sets = Math.floor(qty / groupSize);
  return sets * getQuantity;
}

function proportionalLineDiscounts(
  items: OfferCartLine[],
  totalDiscountRupees: number
): number[] {
  const discount = round2(Math.max(0, totalDiscountRupees));
  const lineSubs = items.map((line) => round2(line.qty * line.priceRupees));
  const subtotal = round2(lineSubs.reduce((s, n) => s + n, 0));
  if (discount <= 0 || subtotal <= 0) return items.map(() => 0);

  let allocated = 0;
  return lineSubs.map((lineSub, index) => {
    const isLast = index === lineSubs.length - 1;
    const share = isLast
      ? round2(Math.min(lineSub, discount - allocated))
      : round2(Math.min(lineSub, (lineSub / subtotal) * discount));
    allocated = round2(allocated + share);
    return share;
  });
}

/** Per-line discount for one offer — zero on lines the offer does not touch. */
export function evaluateSingleOfferLineDiscounts(
  offer: ActiveOffer,
  items: OfferCartLine[]
): number[] {
  const result = items.map(() => 0);
  if (items.length === 0) return result;
  if (!isBogo(offer.discountType) && offer.discountValue <= 0) return result;

  const subtotal = cartSubtotal(items);
  const subtotalPaise = Math.round(subtotal * 100);
  const percent = Math.min(offer.discountValue, 100);

  switch (offer.discountType) {
    case "PERCENT":
      for (let i = 0; i < items.length; i++) {
        const lineSub = items[i]!.qty * items[i]!.priceRupees;
        result[i] = round2((lineSub * percent) / 100);
      }
      return result;
    case "FIXED_AMOUNT":
      return proportionalLineDiscounts(items, Math.min(subtotal, offer.discountValue));
    case "CART_MIN_FLAT":
      if (
        offer.minPurchasePaise != null &&
        subtotalPaise >= Number(offer.minPurchasePaise)
      ) {
        return proportionalLineDiscounts(
          items,
          Math.min(subtotal, offer.discountValue)
        );
      }
      return result;
    case "PRODUCT_PERCENT":
    case "PRODUCT_FIXED": {
      for (let i = 0; i < items.length; i++) {
        const line = items[i]!;
        if (!line.inventoryItemId || !offer.productIds.includes(line.inventoryItemId)) {
          continue;
        }
        if (offer.minQuantity && line.qty < offer.minQuantity) continue;
        const lineSub = line.qty * line.priceRupees;
        result[i] =
          offer.discountType === "PRODUCT_PERCENT"
            ? round2((lineSub * percent) / 100)
            : round2(Math.min(lineSub, offer.discountValue * line.qty));
      }
      return result;
    }
    case "CATEGORY_PERCENT":
    case "CATEGORY_FIXED": {
      for (let i = 0; i < items.length; i++) {
        const line = items[i]!;
        if (!line.categoryKey || !offer.categoryKeys.includes(line.categoryKey)) {
          continue;
        }
        if (offer.minQuantity && line.qty < offer.minQuantity) continue;
        const lineSub = line.qty * line.priceRupees;
        result[i] =
          offer.discountType === "CATEGORY_PERCENT"
            ? round2((lineSub * percent) / 100)
            : round2(Math.min(lineSub, offer.discountValue * line.qty));
      }
      return result;
    }
    case "BUY_X_GET_X": {
      if (!offer.buyQuantity || !offer.getQuantity) return result;
      for (let i = 0; i < items.length; i++) {
        const line = items[i]!;
        if (!line.inventoryItemId || !offer.productIds.includes(line.inventoryItemId)) {
          continue;
        }
        const freeQty = bogoFreeUnits(line.qty, offer.buyQuantity, offer.getQuantity);
        result[i] = round2(freeQty * line.priceRupees);
      }
      return result;
    }
    case "BUY_X_GET_Y": {
      if (!offer.buyQuantity || !offer.getQuantity) return result;
      const indexed = items
        .map((line, index) => ({ line, index }))
        .filter(
          ({ line }) =>
            line.inventoryItemId && offer.productIds.includes(line.inventoryItemId)
        );
      const totalQty = indexed.reduce((s, { line }) => s + line.qty, 0);
      let freeUnits = bogoFreeUnits(totalQty, offer.buyQuantity, offer.getQuantity);
      if (freeUnits <= 0) return result;

      const cheapestFirst = [...indexed].sort(
        (a, b) => a.line.priceRupees - b.line.priceRupees
      );
      for (const { line, index } of cheapestFirst) {
        if (freeUnits <= 0) break;
        const take = Math.min(freeUnits, line.qty);
        result[index] = round2(result[index]! + take * line.priceRupees);
        freeUnits -= take;
      }
      return result;
    }
    default:
      return result;
  }
}

/** Discount for exactly ONE offer on this cart (no stacking with other offers). */
export function evaluateSingleOffer(offer: ActiveOffer, items: OfferCartLine[]): number {
  const lines = evaluateSingleOfferLineDiscounts(offer, items);
  return round2(lines.reduce((s, n) => s + n, 0));
}

/** All offers that apply to this cart, sorted best savings first. */
export function listApplicableOffers(
  items: OfferCartLine[],
  offers: ActiveOffer[]
): ApplicableOfferOption[] {
  const subtotal = cartSubtotal(items);
  const options: ApplicableOfferOption[] = [];

  for (const offer of offers) {
    const raw = evaluateSingleOffer(offer, items);
    if (raw <= 0) continue;
    options.push({
      offerId: offer.id,
      name: offer.name,
      discountRupees: round2(Math.min(raw, subtotal)),
      priority: offer.priority,
    });
  }

  return options.sort((a, b) => {
    if (b.discountRupees !== a.discountRupees) {
      return b.discountRupees - a.discountRupees;
    }
    return b.priority - a.priority;
  });
}

export type OfferSelection = {
  selectedOfferId?: string | null;
  /** Cashier explicitly billed without any offer. */
  skipOffer?: boolean;
};

/** Apply exactly one selected offer — one offer per bill. */
export function resolveOfferPreview(
  items: OfferCartLine[],
  offers: ActiveOffer[],
  selection: OfferSelection = {}
): OfferPreviewResult {
  const { selectedOfferId, skipOffer } = selection;
  const applicableOffers = listApplicableOffers(items, offers);
  const subtotal = cartSubtotal(items);

  if (skipOffer) {
    return {
      applicableOffers,
      selectedOfferId: null,
      requiresSelection: false,
      offerDiscountRupees: 0,
      offerDetails: [],
    };
  }

  if (applicableOffers.length === 0) {
    return {
      applicableOffers: [],
      selectedOfferId: null,
      requiresSelection: false,
      offerDiscountRupees: 0,
      offerDetails: [],
    };
  }

  let resolvedId = selectedOfferId ?? null;
  if (resolvedId && !applicableOffers.some((o) => o.offerId === resolvedId)) {
    resolvedId = null;
  }

  const requiresSelection = applicableOffers.length > 0 && !resolvedId;

  if (!resolvedId) {
    return {
      applicableOffers,
      selectedOfferId: null,
      requiresSelection,
      offerDiscountRupees: 0,
      offerDetails: [],
    };
  }

  const selected = applicableOffers.find((o) => o.offerId === resolvedId)!;
  const selectedOffer = offers.find((o) => o.id === resolvedId)!;
  const lineDiscountRupees = evaluateSingleOfferLineDiscounts(selectedOffer, items);
  const discountRupees = round2(
    Math.min(lineDiscountRupees.reduce((s, n) => s + n, 0), subtotal)
  );

  return {
    applicableOffers,
    selectedOfferId: resolvedId,
    requiresSelection: false,
    offerDiscountRupees: discountRupees,
    lineDiscountRupees,
    offerDetails: [
      {
        offerId: selected.offerId,
        name: selected.name,
        discountRupees,
      },
    ],
  };
}

/** Human-readable rule shown to owners and cashiers. */
export function describeOfferRule(offer: {
  discountType: OfferDiscountType | string;
  discountValue: number;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  minPurchasePaise?: bigint | string | null;
}) {
  const rupees = (n: number) => `₹${n.toFixed(2)}`;
  const buy = offer.buyQuantity ?? 0;
  const get = offer.getQuantity ?? 0;

  switch (offer.discountType) {
    case "PERCENT":
      return `${offer.discountValue}% off the whole bill`;
    case "FIXED_AMOUNT":
      return `${rupees(offer.discountValue)} off the whole bill`;
    case "CART_MIN_FLAT": {
      const min =
        offer.minPurchasePaise != null ? Number(offer.minPurchasePaise) / 100 : 0;
      return `${rupees(offer.discountValue)} off on bills above ${rupees(min)}`;
    }
    case "PRODUCT_PERCENT":
      return `${offer.discountValue}% off selected products`;
    case "PRODUCT_FIXED":
      return `${rupees(offer.discountValue)} off per unit of selected products`;
    case "CATEGORY_PERCENT":
      return `${offer.discountValue}% off the selected category`;
    case "CATEGORY_FIXED":
      return `${rupees(offer.discountValue)} off per unit in the selected category`;
    case "BUY_X_GET_X":
      return `Buy ${buy} get ${get} free (same item, needs ${buy + get} in the bill)`;
    case "BUY_X_GET_Y":
      return `Buy ${buy} get ${get} free (any selected product, needs ${buy + get} in the bill)`;
    default:
      return String(offer.discountType).replace(/_/g, " ").toLowerCase();
  }
}
