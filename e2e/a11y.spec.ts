import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility smoke. Runs axe-core against the key public surfaces and fails
 * only on `critical`/`serious` WCAG 2 A/AA violations (the e2e job is
 * non-blocking, so this is an informational guardrail, not a merge gate).
 *
 * Coverage: the home page, race mode, and a representative workspace per
 * algorithm category (clustering, regression, classification, neural,
 * dimensionality-reduction). The workspace audit also exercises the ambient
 * ChallengeChip / PredictThenReveal panels, which render inline for algorithms
 * that define a prediction.
 *
 * The Monaco editor is a third-party widget with its own a11y story; we exclude
 * its container so our own markup is what's actually under test.
 */

// Make audits deterministic. Two layers: (1) emulate prefers-reduced-motion so
// components that gate animations in JS (e.g. PredictThenReveal) render at rest;
// (2) freeze any remaining CSS animations/transitions to their final frame
// before auditing. Without this, axe can catch a panel mid fade-in at partial
// opacity and report a transient color-contrast failure for text that
// comfortably passes AA at rest.
test.use({ reducedMotion: 'reduce' });

const STEP_RE = /step\s+\d+\/\d+/;

function serious(violations: Array<{ id: string; impact?: string | null }>) {
  return violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

/**
 * Snap all CSS animations/transitions to their resting state. The injected
 * stylesheet persists for the page lifetime, so it also governs elements that
 * mount later (e.g. workspace chips that appear once Pyodide is ready).
 */
async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
}

/**
 * Audit the current page and return a comma-joined list of serious/critical
 * violation ids ('' when clean), so failures name exactly which rules tripped.
 */
async function seriousViolationIds(page: Page, exclude?: string): Promise<string> {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
  if (exclude) builder = builder.exclude(exclude);
  const results = await builder.analyze();
  return serious(results.violations)
    .map((v) => v.id)
    .join(', ');
}

test('home page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await freezeAnimations(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(await seriousViolationIds(page)).toBe('');
});

test('race mode has no serious accessibility violations', async ({ page }) => {
  await page.goto('/race');
  await freezeAnimations(page);
  // The race header renders immediately, before any Pyodide work.
  await expect(page.getByText('Race Mode')).toBeVisible({ timeout: 60_000 });

  expect(await seriousViolationIds(page)).toBe('');
});

// One algorithm per category, to cover the distinct viz/control surfaces
// without paying the Pyodide cost for all 25.
const WORKSPACE_SAMPLE = [
  'kmeans', // clustering (+ cluster-count prediction)
  'linreg', // regression (+ trend prediction)
  'dtree', // classification (boundary-grid viz)
  'mlp', // neural
  'pca', // dimensionality reduction
] as const;

for (const algorithmId of WORKSPACE_SAMPLE) {
  test(`workspace/${algorithmId} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(`/workspace/${algorithmId}`);
    await freezeAnimations(page);
    // The shell mounts immediately (before Pyodide finishes); the step indicator
    // is always present once the viz panel is up.
    await expect(page.getByText(STEP_RE).first()).toBeVisible({ timeout: 60_000 });

    expect(await seriousViolationIds(page, '.monaco-editor')).toBe('');
  });
}
