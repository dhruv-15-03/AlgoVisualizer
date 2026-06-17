import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility smoke. Runs axe-core against the key public surfaces and fails
 * only on `critical`/`serious` WCAG 2 A/AA violations (the e2e job is
 * non-blocking, so this is an informational guardrail, not a merge gate).
 *
 * The Monaco editor is a third-party widget with its own a11y story; we exclude
 * its container so our own markup is what's actually under test.
 */

const STEP_RE = /step\s+\d+\/\d+/;

function serious(violations: Array<{ id: string; impact?: string | null }>) {
  return violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

test('home page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const bad = serious(results.violations);
  expect(bad.map((v) => v.id).join(', ')).toBe('');
});

test('workspace shell has no serious accessibility violations', async ({ page }) => {
  await page.goto('/workspace/kmeans');
  // The shell mounts immediately (before Pyodide finishes); the step indicator
  // is always present once the viz panel is up.
  await expect(page.getByText(STEP_RE).first()).toBeVisible({ timeout: 60_000 });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.monaco-editor')
    .analyze();
  const bad = serious(results.violations);
  expect(bad.map((v) => v.id).join(', ')).toBe('');
});
