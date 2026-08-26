import fs from "node:fs";
import { execSync } from "node:child_process";

const REF = "afc2548";

const files = [
  // Ops console
  "src/app/(ops)/ops/page.tsx",
  "src/app/(ops)/ops/layout.tsx",
  "src/app/(ops)/ops/customers/[id]/page.tsx",
  // Staff & cashier
  "src/app/(app)/staff/page.tsx",
  "src/app/(app)/cashier/page.tsx",
  "src/app/(app)/work-orders/new/page.tsx",
  // Settings
  "src/app/(app)/settings/billing/page.tsx",
  "src/app/(app)/settings/profile/page.tsx",
  "src/app/(app)/settings/storage/page.tsx",
  // Layout & auth
  "src/app/layout.tsx",
  "src/app/onboarding/onboarding-content.tsx",
  "src/components/layout/app-layout-client.tsx",
  "src/components/layout/app-shell.tsx",
  "src/components/layout/command-palette.tsx",
  "src/components/providers.tsx",
  "src/hooks/use-require-auth.ts",
  "src/app/api/v1/auth/login/route.ts",
  "src/app/api/v1/auth/register/route.ts",
  // Billing & org
  "src/components/billing/plan-cards.tsx",
  "src/services/billing.service.ts",
  "src/services/organization.service.ts",
  "src/services/staff.service.ts",
  "src/services/storage-quota.service.ts",
  "src/app/api/v1/billing/me/route.ts",
  "src/app/api/v1/billing/plans/route.ts",
  "src/app/api/v1/organizations/route.ts",
  "src/app/api/v1/organizations/[id]/members/link/route.ts",
  // Ops API
  "src/app/api/v1/ops/summary/route.ts",
  "src/app/api/v1/ops/organizations/[id]/route.ts",
  // Other modules
  "src/app/api/v1/architect/stages/route.ts",
  "src/app/api/v1/builder/bookings/route.ts",
  "src/app/api/v1/builder/units/route.ts",
  "src/app/api/v1/contractor/boq/route.ts",
  "src/app/api/v1/contractor/material/route.ts",
  "src/app/api/v1/contractor/measurements/route.ts",
  "src/app/api/v1/desktop/plan/route.ts",
  "src/app/api/v1/notifications/route.ts",
  "src/app/api/v1/sync/outbox/drain/route.ts",
  // Lib & staff UI
  "src/lib/desktop/local-mode.ts",
  "src/lib/org/require-module.ts",
  "src/lib/staff/cashier-mode.ts",
  "src/components/staff/staff-profile-dialog.tsx",
  // E2E
  "tests/e2e/staff-payroll.spec.ts",
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
