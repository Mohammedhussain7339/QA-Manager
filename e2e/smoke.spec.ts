import { test, expect } from "@playwright/test";

test("dashboard shows last known good per component", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Last known good, per component")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Navbar", exact: true })).toBeVisible();
});

test("Complete Website auto-selects all active cases", async ({ page }) => {
  await page.goto("/runs/new");
  await page.getByRole("button", { name: /Complete Website/ }).click();
  await expect(page.getByRole("button", { name: "Create run (40 cases)" })).toBeEnabled();
  await page.getByRole("button", { name: "Create run (40 cases)" }).click();
  await expect(page).toHaveURL(/\/runs\/Run-004$/);
});

test("Selected + Related shows separate groups with counts", async ({ page }) => {
  await page.goto("/runs/new");
  await page.getByRole("button", { name: /Selected \+ Related/ }).click();
  await page.getByRole("button", { name: "Navbar", exact: true }).click();
  await expect(page.getByText("23 Selected, 14 Related")).toBeVisible();
});

test("a locked run is read-only", async ({ page }) => {
  await page.goto("/runs/Run-001");
  await expect(page.getByText("This run is locked")).toBeVisible();
  await expect(page.getByLabel("Status for TC-NAV-001")).toBeDisabled();
});
