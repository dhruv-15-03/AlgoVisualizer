import { test, expect } from '@playwright/test';

/**
 * Critical navigation journeys. These assert the SPA routing + entry surface
 * without waiting for Pyodide to cold-load, so they're fast and reliable: a URL
 * change on click is enough to prove the route wiring works.
 */

test('home renders the hero and the live counts', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AlgoVisualizer/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The hero stat line cites the live registry counts.
  await expect(page.getByText('algorithms').first()).toBeVisible();
  await expect(page.getByText('datasets').first()).toBeVisible();
  await expect(page.getByText('categories').first()).toBeVisible();
});

test('the primary CTA opens an algorithm workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /open the workspace/i }).click();
  await expect(page).toHaveURL(/\/workspace\/.+/);
});

test('an algorithm card navigates to its workspace', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href^="/workspace/"]').first().click();
  await expect(page).toHaveURL(/\/workspace\/.+/);
});

test('Race mode is reachable from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /race mode/i }).click();
  await expect(page).toHaveURL(/\/race$/);
});

test('an unknown route redirects home', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
