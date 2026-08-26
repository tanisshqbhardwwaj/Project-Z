import { test, expect } from "@playwright/test";

test("landing page is public and light", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /with confidence/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /log in/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /simple pricing/i })).toHaveCount(0);
});

test("pricing page shows plans, contact, and downloads", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: /^basic$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^business$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^professional$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /business pro/i })).toBeVisible();
  await expect(page.getByText(/download apk/i)).toBeVisible();
  await expect(page.getByText(/download for windows/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /ios/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /mac/i })).toBeDisabled();
});

test("login page is a focused sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /simple pricing/i })).toHaveCount(0);
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
