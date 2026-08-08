import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading")).toBeVisible();
});

test("register page loads", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText(/Create your account|registerTitle/i)).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/api/v1/health");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.data?.status).toBe("ok");
});
