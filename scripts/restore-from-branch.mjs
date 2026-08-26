import fs from "node:fs";
import { execSync } from "node:child_process";

const conflictFiles = [
  ".env.example",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "prisma/schema.prisma",
  "src/app/(app)/cashier/page.tsx",
  "src/app/(app)/settings/billing/page.tsx",
  "src/app/(app)/settings/profile/page.tsx",
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
  "src/app/(app)/staff/page.tsx",
  "src/app/(ops)/ops/customers/[id]/page.tsx",
  "src/app/(ops)/ops/layout.tsx",
  "src/app/(ops)/ops/page.tsx",
  "src/app/api/v1/architect/stages/route.ts",
  "src/app/api/v1/auth/login/route.ts",
  "src/app/api/v1/auth/logout/route.ts",
  "src/app/api/v1/auth/register/route.ts",
  "src/app/api/v1/billing/me/route.ts",
  "src/app/api/v1/billing/plans/route.ts",
  "src/app/api/v1/builder/bookings/route.ts",
  "src/app/api/v1/builder/units/route.ts",
  "src/app/api/v1/contractor/boq/route.ts",
  "src/app/api/v1/contractor/material/route.ts",
  "src/app/api/v1/contractor/measurements/route.ts",
  "src/app/api/v1/desktop/plan/route.ts",
  "src/app/api/v1/ops/organizations/[id]/route.ts",
  "src/app/api/v1/ops/summary/route.ts",
  "src/app/api/v1/organizations/route.ts",
  "src/app/api/v1/shop/customers/route.ts",
  "src/app/api/v1/shop/dashboard/route.ts",
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
  "src/app/layout.tsx",
  "src/app/onboarding/onboarding-content.tsx",
  "src/components/billing/plan-cards.tsx",
  "src/components/layout/app-layout-client.tsx",
  "src/components/layout/app-shell.tsx",
  "src/components/layout/command-palette.tsx",
  "src/components/providers.tsx",
  "src/components/shop/cash-tender-panel.tsx",
  "src/components/shop/customer-picker.tsx",
  "src/components/shop/inventory-tools-dialog.tsx",
  "src/components/shop/invoice-entry-form.tsx",
  "src/components/shop/invoice-preview-root.tsx",
  "src/components/shop/invoice-return-panel.tsx",
  "src/components/shop/product-stock-list.tsx",
  "src/components/shop/shop-invoice-print.tsx",
  "src/components/shop/shopkeeper-dashboard.tsx",
  "src/components/shop/staff-sales-sidebar.tsx",
  "src/components/staff/staff-profile-dialog.tsx",
  "src/hooks/use-nav-items.ts",
  "src/hooks/use-require-auth.ts",
  "src/lib/api/context.ts",
  "src/lib/desktop/local-mode.ts",
  "src/lib/org/require-module.ts",
  "src/lib/org/shop-settings.ts",
  "src/lib/shop/bill-number.ts",
  "src/lib/shop/ensure-shop-sale-schema.ts",
  "src/lib/shop/inventory.ts",
  "src/lib/shop/invoice-pricing.ts",
  "src/lib/staff/cashier-mode.ts",
  "src/services/billing.service.ts",
  "src/services/organization.service.ts",
  "src/services/shop-activity.service.ts",
  "src/services/shop-credit.service.ts",
  "src/services/shop-expense.service.ts",
  "src/services/shop-held-bill.service.ts",
  "src/services/shop-purchase.service.ts",
  "src/services/shop-return.service.ts",
  "src/services/shop.service.ts",
  "src/services/staff.service.ts",
  "src/services/storage-quota.service.ts",
  "tests/e2e/staff-payroll.spec.ts",
  "tests/unit/shop/bill-number.test.ts",
  "tests/unit/shop/invoice-pricing.test.ts",
];

const appKeepFiles = [
  "src/middleware.ts",
  "src/app/api/v1/shop/dashboard/route.ts",
  "src/components/shop/shopkeeper-dashboard.tsx",
  "src/lib/api/context.ts",
  "src/lib/api/correlation-id.ts",
  "src/app/api/v1/auth/logout/route.ts",
  "src/lib/auth/logout-client.ts",
  "src/components/shop/dashboard-invoice-filters.tsx",
];

function restore(ref, files) {
  let ok = 0;
  for (const file of files) {
    try {
      const content = execSync(`git show ${ref}:${file}`, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      fs.writeFileSync(file, content);
      ok++;
    } catch (err) {
      console.warn(`skip ${file}: ${err.message}`);
    }
  }
  return ok;
}

const fromMaster = restore("origin/master", conflictFiles);
const fromApp = restore("afc2548", appKeepFiles);

// Pin Node 24 for Vercel alignment with dashboard setting.
const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.engines = { node: "24.x" };
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// Merge next.config: master redirects + App sql.js turbopack.
let nextCfg = fs.readFileSync("next.config.ts", "utf8");
if (!nextCfg.includes("sql.js")) {
  nextCfg = nextCfg.replace(
    'serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "inngest", "heic-convert"],',
    'serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "inngest", "heic-convert", "sql.js"],\n  turbopack: {\n    resolveAlias: {\n      "sql.js": "./src/lib/local-db/sqljs-browser-stub.ts",\n    },\n  },'
  );
  fs.writeFileSync("next.config.ts", nextCfg);
}

// Ensure prisma Organization has syncMutations relation if App added SyncMutation model.
let schema = fs.readFileSync("prisma/schema.prisma", "utf8");
if (
  schema.includes("model SyncMutation") &&
  !schema.includes("syncMutations    SyncMutation[]")
) {
  schema = schema.replace(
    "  syncOutbox       SyncOutbox[]\n  devices          Device[]",
    "  syncOutbox       SyncOutbox[]\n  syncMutations    SyncMutation[]\n  devices          Device[]"
  );
  fs.writeFileSync("prisma/schema.prisma", schema);
}

console.log(`Restored ${fromMaster} files from origin/master`);
console.log(`Restored ${fromApp} App-specific files from afc2548`);
