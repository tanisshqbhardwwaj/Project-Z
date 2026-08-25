import { listApplicableOffers, type ActiveOffer } from "../src/lib/shop/offer-engine";

const jacketId = "bc377e43-c622-459d-8a20-4b71c97cee3d";
const tshirtId = "6582aff4-346b-4fee-a726-ca787e41db46";

const trial: ActiveOffer = {
  id: "trial",
  name: "TRIAL OFFER",
  discountType: "BUY_X_GET_X",
  discountValue: 11,
  productIds: [jacketId, tshirtId],
  categoryKeys: [],
  minQuantity: null,
  minPurchasePaise: null,
  buyQuantity: 1,
  getQuantity: 1,
  priority: 0,
};

const earlyBird: ActiveOffer = {
  id: "early",
  name: "Early bird",
  discountType: "BUY_X_GET_X",
  discountValue: 15,
  productIds: [jacketId],
  categoryKeys: [],
  minQuantity: null,
  minPurchasePaise: null,
  buyQuantity: 2,
  getQuantity: 1,
  priority: 0,
};

const cases: Array<[string, { inventoryItemId: string; name: string; qty: number; priceRupees: number }[]]> = [
  ["1 T-Shirt + 1 Jacket (screenshot)", [
    { inventoryItemId: tshirtId, name: "T Shirt", qty: 1, priceRupees: 900.01 },
    { inventoryItemId: jacketId, name: "Jacket", qty: 1, priceRupees: 1500 },
  ]],
  ["2 Jackets", [{ inventoryItemId: jacketId, name: "Jacket", qty: 2, priceRupees: 1500 }]],
  ["3 Jackets", [{ inventoryItemId: jacketId, name: "Jacket", qty: 3, priceRupees: 1500 }]],
  ["4 Jackets", [{ inventoryItemId: jacketId, name: "Jacket", qty: 4, priceRupees: 1500 }]],
];

for (const [label, items] of cases) {
  const subtotal = items.reduce((s, l) => s + l.qty * l.priceRupees, 0);
  const applicable = listApplicableOffers(items, [trial, earlyBird]);
  console.log(`\n${label} — subtotal ₹${subtotal.toFixed(2)}`);
  if (applicable.length === 0) console.log("  no offer applies");
  for (const o of applicable) {
    console.log(`  ${o.name}: − ₹${o.discountRupees.toFixed(2)}`);
  }
}
