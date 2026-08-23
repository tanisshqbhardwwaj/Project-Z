/**
 * End-to-end verification against a real SQLite database.
 *
 * Exercises the flows this branch changed — product/variant creation, sales
 * from a scanned variant, partial returns, partial exchanges in both money
 * directions, recurring expense occurrences and staff commission — and asserts
 * that inventory quantities and financial records stay consistent.
 *
 * Run with: node --env-file=.env scripts/verify-shop-flows.mjs
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

let failures = 0;
let checks = 0;

function check(label, actual, expected) {
  checks++;
  const ok = String(actual) === String(expected);
  if (!ok) {
    failures++;
    console.error(`  FAIL ${label}\n       expected ${expected}, got ${actual}`);
  } else {
    console.log(`  ok   ${label} = ${actual}`);
  }
}

function expectThrows(label, fn) {
  checks++;
  return fn().then(
    () => {
      failures++;
      console.error(`  FAIL ${label} — expected an error but the call succeeded`);
    },
    (err) => {
      console.log(`  ok   ${label} → rejected: ${err.message.slice(0, 90)}`);
    }
  );
}

async function main() {
  const dbFile = path.join(root, "prisma", "verify.db");
  process.env.DATABASE_URL = `file:${dbFile}`;
  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "pipe",
    env: process.env,
  });

  // Drive the app's own client through the libSQL adapter, which is the code
  // path production (Turso) uses.
  process.env.TURSO_DATABASE_URL = `file:${dbFile}`;
  process.env.TURSO_AUTH_TOKEN = "local";

  const { prisma } = await import("../src/lib/db/prisma.ts");

  // ── Fixture: one shopkeeper org with every relevant module on ──────────────
  const user = await prisma.user.create({
    data: { email: `verify-${Date.now()}@example.com`, name: "Verify Owner" },
  });
  const org = await prisma.organization.create({
    data: {
      name: "Verify Clothing Store",
      slug: `verify-${Date.now()}`,
      businessType: "SHOPKEEPER",
      shopSector: "CLOTHING",
      subscriptionStatus: "ACTIVE",
      plan: "BUSINESS_PRO",
      settings: {
        modules: {
          shop_sales: true,
          shop_inventory: true,
          shop_expenses: true,
          shop_udhaar: true,
          shop_purchases: true,
          staff: true,
        },
        shop: { businessTypes: ["CLOTHING", "FOOTWEAR"] },
      },
      members: { create: { userId: user.id, role: "OWNER", status: "ACTIVE" } },
    },
  });

  const ctx = { organizationId: org.id, userId: user.id };

  // Services are TypeScript; run them through tsx so this stays a single script.
  const {
    createShopProduct,
    addProductVariants,
    findSimilarProducts,
    listShopProducts,
  } = await import("../src/services/shop-product.service.ts");
  const { createShopSale, lookupInventoryByBarcode } = await import(
    "../src/services/shop.service.ts"
  );
  const { processReturn, getReturnableLines } = await import(
    "../src/services/shop-return.service.ts"
  );
  const {
    createRecurringExpense,
    getRecurringExpenseOverview,
    markOccurrencePaid,
    syncRecurringOccurrences,
  } = await import("../src/services/shop-recurring-expense.service.ts");
  const { ensureDefaultShopExpenseCategories, listShopExpenseCategories } =
    await import("../src/services/shop-expense.service.ts");
  const { createStaffMember } = await import("../src/services/staff.service.ts");
  const { computeStaffCommission } = await import(
    "../src/services/staff-commission.service.ts"
  );
  const { listShopCategories, createShopCategory } = await import(
    "../src/services/shop-category.service.ts"
  );

  // ── 1. Inventory: product with multiple sizes ─────────────────────────────
  console.log("\n1. Product with multiple sizes");
  const tshirt = await createShopProduct({
    ...ctx,
    name: "Premium Cotton T-Shirt",
    brand: "Nike",
    categoryKey: "tshirts",
    subCategoryKey: "men",
    hasVariants: true,
    variantAxis: "size",
    defaultSellRupees: 1000,
    defaultCostRupees: 600,
    defaultReorderLevel: 5,
    variants: [
      { size: "S", color: "Black", quantity: 10 },
      { size: "M", color: "Black", quantity: 15 },
      { size: "L", color: "Black", quantity: 20 },
      { size: "XL", color: "Black", quantity: 12 },
      { size: "XXL", color: "Black", quantity: 8 },
    ],
  });
  check("variants created", tshirt.variants.length, 5);
  const barcodes = tshirt.variants.map((v) => v.barcode);
  check("every variant has a barcode", barcodes.every(Boolean), true);
  check("all barcodes unique", new Set(barcodes).size, 5);
  check("all SKUs unique", new Set(tshirt.variants.map((v) => v.sku)).size, 5);

  // ── 2. Product with no variants, and with exactly one ─────────────────────
  console.log("\n2. Products without variants / with one size");
  const rice = await createShopProduct({
    ...ctx,
    name: "Basmati Rice 5 kg",
    categoryKey: "staples",
    hasVariants: false,
    unit: "bag",
    defaultSellRupees: 550,
    variants: [{ quantity: 40 }],
  });
  check("no-variant product has one stock row", rice.variants.length, 1);
  check("no-variant row has no size", rice.variants[0].size, "null");

  const oneSize = await createShopProduct({
    ...ctx,
    name: "Leather Belt",
    hasVariants: true,
    variants: [{ size: "Free", quantity: 6, sellRupees: 450 }],
  });
  check("single-size product", oneSize.variants.length, 1);

  // ── 3. Duplicate names allowed, but flagged ───────────────────────────────
  console.log("\n3. Duplicate product names");
  const duplicate = await createShopProduct({
    ...ctx,
    name: "Premium Cotton T-Shirt",
    brand: "Nike",
    supplierName: "Delhi Wholesale",
    hasVariants: true,
    defaultSellRupees: 1100,
    defaultCostRupees: 700,
    variants: [{ size: "M", color: "White", quantity: 9 }],
  });
  check("duplicate name accepted", Boolean(duplicate.id), true);
  const similar = await findSimilarProducts({
    organizationId: org.id,
    name: "Premium Cotton T-Shirt",
  });
  check("similar products surfaced", similar.length >= 2, true);

  await expectThrows("duplicate barcode rejected", () =>
    createShopProduct({
      ...ctx,
      name: "Clashing Product",
      hasVariants: false,
      variants: [{ barcode: barcodes[0], quantity: 1 }],
    })
  );
  await expectThrows("same size twice in one product rejected", () =>
    createShopProduct({
      ...ctx,
      name: "Repeated Size Product",
      hasVariants: true,
      variants: [
        { size: "M", quantity: 1 },
        { size: "M", quantity: 2 },
      ],
    })
  );
  await expectThrows("adding an existing size again rejected", () =>
    addProductVariants({
      ...ctx,
      productId: tshirt.id,
      variants: [{ size: "M", color: "Black", quantity: 3 }],
    })
  );

  // ── 4. Multiple colours across multiple sizes ─────────────────────────────
  console.log("\n4. Multiple colours + multiple sizes");
  const added = await addProductVariants({
    ...ctx,
    productId: tshirt.id,
    variants: [
      { size: "S", color: "White", quantity: 4 },
      { size: "M", color: "White", quantity: 5 },
    ],
  });
  check("colour variants added", added.length, 2);

  const productList = await listShopProducts(org.id);
  const tshirtRow = productList.find((p) => p.id === tshirt.id);
  check("product list groups sizes into one row", tshirtRow.variants.length, 7);
  check(
    "product list total stock",
    tshirtRow.totalQuantity,
    10 + 15 + 20 + 12 + 8 + 4 + 5
  );

  // ── 5. Categories adapt to selected business types + custom ───────────────
  console.log("\n5. Categories");
  const categories = await listShopCategories(org.id);
  const labels = categories.map((c) => c.label);
  check("clothing categories present", labels.includes("T-Shirts"), true);
  check("footwear categories present", labels.includes("Sports Shoes"), true);
  await createShopCategory({ ...ctx, label: "Oversized Streetwear" });
  const withCustom = await listShopCategories(org.id);
  check(
    "custom category listed first",
    withCustom[0].label,
    "Oversized Streetwear"
  );

  // ── 6. Staff with commission ──────────────────────────────────────────────
  console.log("\n6. Staff");
  const rahul = await createStaffMember({
    organizationId: org.id,
    createdById: user.id,
    name: "Rahul",
    roleTitle: "Sales Staff",
    roleKey: "SALES_STAFF",
    wageRupees: 20000,
    wagePeriod: "MONTHLY",
    commissionType: "PERCENT",
    commissionPercent: 2,
  });
  const meena = await createStaffMember({
    organizationId: org.id,
    createdById: user.id,
    name: "Meena",
    roleTitle: "Cashier",
    wageRupees: 15000,
    wagePeriod: "MONTHLY",
    commissionType: "NONE",
  });
  check("commission configured", rahul.commissionType, "PERCENT");
  check("no-commission staff", meena.commissionType, "NONE");

  // ── 7. Sale from a scanned variant ────────────────────────────────────────
  console.log("\n7. Sale — barcode resolves to one variant");
  const mVariant = tshirt.variants.find(
    (v) => v.size === "M" && v.color === "Black"
  );
  const scanned = await lookupInventoryByBarcode(org.id, mVariant.barcode);
  check("scan resolves the exact variant", scanned.id, mVariant.id);
  check("scan carries the size", scanned.size, "M");
  check(
    "scan display name",
    scanned.displayName,
    "Premium Cotton T-Shirt — Black — Size M"
  );

  const bill1001 = await createShopSale({
    organizationId: org.id,
    createdById: user.id,
    customerName: "Anil Kumar",
    customerPhone: "9990001111",
    staffId: rahul.id,
    paymentMethod: "CASH",
    items: [
      {
        name: "Premium Cotton T-Shirt",
        qty: 3,
        priceRupees: 1000,
        inventoryItemId: mVariant.id,
      },
    ],
  });
  check("bill total", bill1001.totalPaise.toString(), "300000");
  check("bill linked to staff", bill1001.staffId, rahul.id);

  const afterSale = await prisma.inventoryItem.findUnique({
    where: { id: mVariant.id },
  });
  check("only the M variant was deducted", afterSale.quantity, 12);
  const lVariant = tshirt.variants.find((v) => v.size === "L");
  const lAfter = await prisma.inventoryItem.findUnique({
    where: { id: lVariant.id },
  });
  check("other sizes untouched", lAfter.quantity, 20);

  const storedItems = bill1001.itemsJson;
  check("sold line records the size", storedItems[0].size, "M");
  check("sold line records the barcode", storedItems[0].barcode, mVariant.barcode);

  await expectThrows("selling more than stock rejected", () =>
    createShopSale({
      organizationId: org.id,
      createdById: user.id,
      paymentMethod: "CASH",
      items: [
        {
          name: "Premium Cotton T-Shirt",
          qty: 999,
          priceRupees: 1000,
          inventoryItemId: mVariant.id,
        },
      ],
    })
  );

  // ── 8. Partial return ─────────────────────────────────────────────────────
  console.log("\n8. Partial return (1 of 3)");
  let returnable = await getReturnableLines(org.id, bill1001.id);
  check("returnable shows the variant", returnable[0].displayName.includes("Size M"), true);
  check("returnable qty", returnable[0].remainingQty, 3);

  const ret1 = await processReturn({
    ...ctx,
    shopSaleId: bill1001.id,
    reason: "CUSTOMER_CHANGED_MIND",
    refundMethod: "CASH",
    staffId: rahul.id,
    lines: [{ lineKey: returnable[0].lineKey, returnQty: 1 }],
  });
  check("return receipt numbered", ret1.returnNumber.startsWith("RET-"), true);
  check("return type", ret1.type, "RETURN");
  check("return value", ret1.returnValuePaise.toString(), "100000");
  check("refund amount", ret1.refundAmountPaise.toString(), "100000");
  check("return line records size", ret1.lines[0].size, "M");

  const afterReturn = await prisma.inventoryItem.findUnique({
    where: { id: mVariant.id },
  });
  check("returned stock came back to the M variant", afterReturn.quantity, 13);

  const originalBill = await prisma.shopSale.findUnique({
    where: { id: bill1001.id },
  });
  check("original invoice total unchanged", originalBill.totalPaise.toString(), "300000");
  check("original invoice items unchanged", originalBill.itemsJson[0].qty, 3);

  // ── 9. Second partial return, then over-return guard ──────────────────────
  console.log("\n9. Return after a previous partial return");
  returnable = await getReturnableLines(org.id, bill1001.id);
  check("remaining after first return", returnable[0].remainingQty, 2);

  const ret2 = await processReturn({
    ...ctx,
    shopSaleId: bill1001.id,
    reason: "DAMAGED",
    refundMethod: "UPI",
    lines: [{ lineKey: returnable[0].lineKey, returnQty: 1 }],
  });
  check("second receipt has its own number", ret2.returnNumber !== ret1.returnNumber, true);

  returnable = await getReturnableLines(org.id, bill1001.id);
  check("remaining after two returns", returnable[0].remainingQty, 1);

  await expectThrows("over-returning rejected", () =>
    processReturn({
      ...ctx,
      shopSaleId: bill1001.id,
      reason: "OTHER",
      refundMethod: "CASH",
      lines: [{ lineKey: returnable[0].lineKey, returnQty: 5 }],
    })
  );
  await expectThrows("zero-quantity return rejected", () =>
    processReturn({
      ...ctx,
      shopSaleId: bill1001.id,
      reason: "OTHER",
      refundMethod: "CASH",
      lines: [{ lineKey: returnable[0].lineKey, returnQty: 0 }],
    })
  );

  // ── 10. Partial exchange — customer pays the difference ───────────────────
  console.log("\n10. Partial exchange (customer pays difference)");
  const bill2 = await createShopSale({
    organizationId: org.id,
    createdById: user.id,
    customerName: "Sita Devi",
    customerPhone: "9990002222",
    staffId: rahul.id,
    paymentMethod: "CASH",
    items: [
      {
        name: "Premium Cotton T-Shirt",
        qty: 3,
        priceRupees: 1000,
        inventoryItemId: lVariant.id,
      },
    ],
  });
  const beltVariant = oneSize.variants[0];
  const beltBefore = await prisma.inventoryItem.findUnique({
    where: { id: beltVariant.id },
  });

  const lines2 = await getReturnableLines(org.id, bill2.id);
  const exchangeUp = await processReturn({
    ...ctx,
    shopSaleId: bill2.id,
    type: "EXCHANGE",
    reason: "WRONG_PRODUCT",
    refundMethod: "CASH",
    lines: [{ lineKey: lines2[0].lineKey, returnQty: 1 }],
    exchangeItems: [
      {
        inventoryItemId: beltVariant.id,
        name: "Leather Belt",
        qty: 1,
        priceRupees: 1200,
      },
    ],
  });
  check("exchange receipt prefix", exchangeUp.returnNumber.startsWith("EX-"), true);
  check("exchange type", exchangeUp.type, "EXCHANGE");
  check("returned value", exchangeUp.returnValuePaise.toString(), "100000");
  check("replacement value", exchangeUp.exchangeValuePaise.toString(), "120000");
  check("customer pays difference", exchangeUp.additionalPaidPaise.toString(), "20000");
  check("no refund on a dearer exchange", exchangeUp.refundAmountPaise.toString(), "0");
  check(
    "exchange records both directions",
    `${exchangeUp.lines.filter((l) => l.isExchangeOut).length}/${exchangeUp.lines.filter((l) => l.isExchangeIn).length}`,
    "1/1"
  );

  const lAfterExchange = await prisma.inventoryItem.findUnique({
    where: { id: lVariant.id },
  });
  const beltAfter = await prisma.inventoryItem.findUnique({
    where: { id: beltVariant.id },
  });
  check("returned size L back in stock", lAfterExchange.quantity, 18);
  check("replacement deducted", beltAfter.quantity, beltBefore.quantity - 1);

  const bill2Row = await prisma.shopSale.findUnique({ where: { id: bill2.id } });
  check("exchange left the original bill alone", bill2Row.totalPaise.toString(), "300000");

  // ── 11. Exchange where the replacement is cheaper ─────────────────────────
  console.log("\n11. Exchange (customer gets a refund)");
  const lines2b = await getReturnableLines(org.id, bill2.id);
  const exchangeDown = await processReturn({
    ...ctx,
    shopSaleId: bill2.id,
    type: "EXCHANGE",
    reason: "CUSTOMER_CHANGED_MIND",
    refundMethod: "CASH",
    lines: [{ lineKey: lines2b[0].lineKey, returnQty: 1 }],
    exchangeItems: [
      {
        inventoryItemId: beltVariant.id,
        name: "Leather Belt",
        qty: 1,
        priceRupees: 800,
      },
    ],
  });
  check("refund on a cheaper exchange", exchangeDown.refundAmountPaise.toString(), "20000");
  check("nothing extra collected", exchangeDown.additionalPaidPaise.toString(), "0");

  // ── 12. Same-price exchange, and multi-item exchange ─────────────────────
  console.log("\n12. Same-price and multi-item exchange");
  const bill3 = await createShopSale({
    organizationId: org.id,
    createdById: user.id,
    customerName: "Walk-in",
    paymentMethod: "CASH",
    items: [
      {
        name: "Premium Cotton T-Shirt",
        qty: 2,
        priceRupees: 1000,
        inventoryItemId: tshirt.variants.find((v) => v.size === "XL").id,
      },
    ],
  });
  const lines3 = await getReturnableLines(org.id, bill3.id);
  const evenExchange = await processReturn({
    ...ctx,
    shopSaleId: bill3.id,
    type: "EXCHANGE",
    reason: "WRONG_PRODUCT",
    refundMethod: "CASH",
    lines: [{ lineKey: lines3[0].lineKey, returnQty: 2 }],
    exchangeItems: [
      {
        inventoryItemId: tshirt.variants.find((v) => v.size === "XXL").id,
        name: "Premium Cotton T-Shirt",
        qty: 1,
        priceRupees: 1000,
      },
      {
        inventoryItemId: tshirt.variants.find((v) => v.size === "S").id,
        name: "Premium Cotton T-Shirt",
        qty: 1,
        priceRupees: 1000,
      },
    ],
  });
  check("even exchange settles at zero", evenExchange.refundAmountPaise.toString(), "0");
  check("even exchange collects nothing", evenExchange.additionalPaidPaise.toString(), "0");
  check("two replacement lines", evenExchange.lines.filter((l) => l.isExchangeIn).length, 2);

  // A fresh bill, so this fails on the missing replacement rather than on the
  // previous exchange having consumed the line.
  const bill4 = await createShopSale({
    organizationId: org.id,
    createdById: user.id,
    paymentMethod: "CASH",
    items: [
      {
        name: "Basmati Rice 5 kg",
        qty: 2,
        priceRupees: 550,
        inventoryItemId: rice.variants[0].id,
      },
    ],
  });
  const lines4 = await getReturnableLines(org.id, bill4.id);
  check("no-variant product needs no size on the return line", lines4[0].size, "null");
  await expectThrows("exchange without a replacement rejected", () =>
    processReturn({
      ...ctx,
      shopSaleId: bill4.id,
      type: "EXCHANGE",
      reason: "OTHER",
      refundMethod: "CASH",
      lines: [{ lineKey: lines4[0].lineKey, returnQty: 1 }],
      exchangeItems: [],
    })
  );
  await expectThrows("returning a line not on the bill rejected", () =>
    processReturn({
      ...ctx,
      shopSaleId: bill4.id,
      reason: "OTHER",
      refundMethod: "CASH",
      lines: [{ lineKey: "inv:does-not-exist:100", returnQty: 1 }],
    })
  );

  // ── 13. Staff commission adjusts for returns ─────────────────────────────
  console.log("\n13. Staff sales commission");
  const now = new Date();
  const commission = await computeStaffCommission({
    organizationId: org.id,
    staffId: rahul.id,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  check("invoices attributed", commission.invoiceCount, 2);
  check("gross sales", commission.grossSalesPaise.toString(), "600000");
  // Bill 1001: ₹3,000 − ₹2,000 returned = ₹1,000 eligible.
  // Bill 2:    ₹3,000 − ₹2,000 returned + ₹2,000 replacements = ₹3,000 eligible.
  check("eligible sales net of returns", commission.eligibleSalesPaise.toString(), "400000");
  check("2% commission on eligible sales", commission.commissionPaise.toString(), "8000");
  check(
    "commission reduced by returns",
    commission.returnAdjustmentPaise.toString(),
    "4000"
  );

  const meenaCommission = await computeStaffCommission({
    organizationId: org.id,
    staffId: meena.id,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  check("no-commission staff earns nothing", meenaCommission.commissionPaise.toString(), "0");

  // ── 14. Recurring expenses ───────────────────────────────────────────────
  console.log("\n14. Recurring expenses");
  await ensureDefaultShopExpenseCategories(org.id);
  const expenseCategories = await listShopExpenseCategories(org.id);
  const rentCategory = expenseCategories.find((c) => c.name === "Rent");

  const rent = await createRecurringExpense({
    ...ctx,
    categoryId: rentCategory.id,
    name: "Shop Rent",
    monthlyAmountRupees: 25000,
    dueDay: 5,
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)),
    reminderDaysBefore: 3,
    paymentMethod: "BANK",
  });
  check("recurring rule created", rent.name, "Shop Rent");

  await syncRecurringOccurrences(org.id);
  let overview = await getRecurringExpenseOverview(org.id);
  const occurrenceCount =
    overview.upcoming.length + overview.pending.length + overview.history.length;
  check("occurrences generated for past and future months", occurrenceCount >= 5, true);
  check("has upcoming months", overview.upcoming.length >= 1, true);
  check("has pending months", overview.pending.length >= 1, true);
  check(
    "monthly commitment",
    overview.totals.monthlyCommitmentPaise,
    "2500000"
  );

  const firstPending = overview.pending[0];
  const paid = await markOccurrencePaid({
    ...ctx,
    occurrenceId: firstPending.id,
    paymentMethod: "BANK",
  });
  check("occurrence marked paid", paid.status, "PAID");
  check("payment amount", paid.paidAmountPaise, "2500000");

  overview = await getRecurringExpenseOverview(org.id);
  check("paid month moved into history", overview.history.length >= 1, true);
  check(
    "other months stay unpaid",
    overview.pending.every((o) => o.status === "PENDING"),
    true
  );
  check("rule still active", overview.rules[0].isActive, true);
  check("future months still queued", overview.upcoming.length >= 1, true);

  const postedExpense = await prisma.shopExpense.findFirst({
    where: { organizationId: org.id, expenseType: "MONTHLY" },
  });
  check("paying posted a matching expense", postedExpense.amountPaise.toString(), "2500000");

  await expectThrows("paying the same month twice rejected", () =>
    markOccurrencePaid({ ...ctx, occurrenceId: firstPending.id })
  );

  // ── 15. Data integrity across the whole run ──────────────────────────────
  console.log("\n15. Data integrity");
  const orphanVariants = await prisma.inventoryItem.count({
    where: { organizationId: org.id, productId: null },
  });
  check("every variant has a parent product", orphanVariants, 0);

  const negativeStock = await prisma.inventoryItem.count({
    where: { organizationId: org.id, quantity: { lt: 0 } },
  });
  check("no negative stock anywhere", negativeStock, 0);

  const returnRows = await prisma.shopSaleReturn.findMany({
    where: { organizationId: org.id },
    include: { lines: true },
  });
  const balanced = returnRows.every((r) => {
    const out = r.lines
      .filter((l) => l.isExchangeOut)
      .reduce((sum, l) => sum + l.lineRefundPaise, 0n);
    const inn = r.lines
      .filter((l) => l.isExchangeIn)
      .reduce((sum, l) => sum + l.lineRefundPaise, 0n);
    return (
      out === r.returnValuePaise &&
      inn === r.exchangeValuePaise &&
      r.refundAmountPaise - r.additionalPaidPaise === out - inn
    );
  });
  check("every receipt's lines tie out to its totals", balanced, true);

  const uniqueNumbers = new Set(returnRows.map((r) => r.returnNumber));
  check("receipt numbers unique", uniqueNumbers.size, returnRows.length);

  const allBarcodes = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id, barcode: { not: null } },
    select: { barcode: true },
  });
  check(
    "barcodes unique across the catalogue",
    new Set(allBarcodes.map((b) => b.barcode)).size,
    allBarcodes.length
  );

  await prisma.$disconnect();

  console.log(
    `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}`
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nverification crashed:", err);
  process.exit(1);
});
