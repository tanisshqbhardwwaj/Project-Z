import fs from "node:fs";
import { execSync } from "node:child_process";

const REF = "afc2548";

const files = [
  // Shop pages
  "src/app/(app)/shop/activity/page.tsx",
  "src/app/(app)/shop/customers/page.tsx",
  "src/app/(app)/shop/expenses/page.tsx",
  "src/app/(app)/shop/expenses/report/page.tsx",
  "src/app/(app)/shop/inventory/page.tsx",
  "src/app/(app)/shop/invoices/[id]/page.tsx",
  "src/app/(app)/shop/invoices/new/page.tsx",
  "src/app/(app)/shop/invoices/page.tsx",
  "src/app/(app)/shop/invoices/settings/page.tsx",
  "src/app/(app)/shop/purchases/[id]/page.tsx",
  "src/app/(app)/shop/purchases/page.tsx",
  "src/app/(app)/shop/returns/page.tsx",
  "src/app/(app)/shop/scan/page.tsx",
  "src/app/(app)/shop/udhaar/[id]/page.tsx",
  "src/app/(app)/shop/udhaar/page.tsx",
  // Shop API routes
  "src/app/api/v1/shop/customers/route.ts",
  "src/app/api/v1/shop/dashboard/staff-invoices/route.ts",
  "src/app/api/v1/shop/expenses/route.ts",
  "src/app/api/v1/shop/held-bills/route.ts",
  "src/app/api/v1/shop/inventory/lookup/route.ts",
  "src/app/api/v1/shop/inventory/route.ts",
  "src/app/api/v1/shop/offers/preview/route.ts",
  "src/app/api/v1/shop/purchases/route.ts",
  "src/app/api/v1/shop/returns/route.ts",
  "src/app/api/v1/shop/sales/route.ts",
  "src/app/api/v1/shop/udhaar/payments/route.ts",
  "src/app/api/v1/shop/udhaar/route.ts",
  // Shop components
  "src/components/shop/cash-tender-panel.tsx",
  "src/components/shop/customer-picker.tsx",
  "src/components/shop/inventory-tools-dialog.tsx",
  "src/components/shop/invoice-entry-form.tsx",
  "src/components/shop/invoice-preview-root.tsx",
  "src/components/shop/invoice-return-panel.tsx",
  "src/components/shop/product-stock-list.tsx",
  "src/components/shop/shop-invoice-print.tsx",
  "src/components/shop/staff-sales-sidebar.tsx",
  // Hooks & lib
  "src/hooks/use-nav-items.ts",
  "src/lib/shop/ensure-shop-sale-schema.ts",
  "src/lib/shop/invoice-pricing.ts",
  // Services
  "src/services/shop-activity.service.ts",
  "src/services/shop-expense.service.ts",
  "src/services/shop-held-bill.service.ts",
  "src/services/shop-purchase.service.ts",
  "src/services/shop-return.service.ts",
  // Tests
  "tests/unit/shop/invoice-pricing.test.ts",
  "tests/unit/shop/dashboard-filters.test.ts",
];

let restored = 0;
for (const file of files) {
  try {
    const content = execSync(`git show ${REF}:${file}`, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    fs.writeFileSync(file, content);
    restored++;
    console.log("restored", file);
  } catch (err) {
    console.warn("skip", file, err.message?.split("\n")[0]);
  }
}

console.log(`\nRestored ${restored}/${files.length} files from ${REF}.`);
