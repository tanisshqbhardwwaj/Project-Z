import { test, expect } from "@playwright/test";

<<<<<<< HEAD
const email = process.env.E2E_EMAIL ?? "tanishqbhardwaj457@gmail.com";
const password = process.env.E2E_PASSWORD ?? "password123";

async function login(page: import("@playwright/test").Page) {
=======
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function login(page: import("@playwright/test").Page) {
  if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required");
>>>>>>> origin/master
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|staff|onboarding)/, { timeout: 30_000 });
}

test.describe("staff attendance and payroll", () => {
<<<<<<< HEAD
  test.skip(!process.env.E2E_RUN_STAFF, "Set E2E_RUN_STAFF=1 with seeded user and staff module enabled");
=======
  test.skip(!process.env.E2E_RUN_STAFF || !email || !password, "Set E2E_RUN_STAFF=1, E2E_EMAIL, and E2E_PASSWORD with a seeded user");
>>>>>>> origin/master

  test("mark attendance, generate payroll, open payslip", async ({ page }) => {
    await login(page);
    await page.goto("/staff");

    await expect(page.getByRole("heading", { name: /staff|labour/i })).toBeVisible({
      timeout: 15_000,
    });

    const presentBtn = page.getByRole("button", { name: /^present$/i }).first();
    if (await presentBtn.isVisible()) {
      await presentBtn.click();
    }

    await page.getByRole("tab", { name: /payroll/i }).click();
    const generateBtn = page.getByRole("button", { name: /generate|recalculate/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }

    await expect(page.getByText(/net pay|final|paid/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
