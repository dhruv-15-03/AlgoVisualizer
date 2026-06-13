import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke test for every algorithm workspace.
 *
 * For each /workspace/<id> it loads the page, waits for Pyodide to cold-load and
 * the controller to auto-run (clicking "Run now" as a fallback), then asserts
 * the step timeline reached `step N/M` with M > 0 and the "What's happening now"
 * explanation rendered real content (not the empty placeholder).
 *
 * The id list is hardcoded (not imported from `@/algorithms/registry`) because
 * the Playwright runner has no Vite `?raw` loader for the algorithms' Python
 * sources. It must stay in sync with src/types/algorithm.ts → AlgorithmId.
 */
const ALGORITHMS = [
  'kmeans',
  'linreg',
  'logreg',
  'dtree',
  'knn',
  'naivebayes',
  'svm',
  'randomforest',
  'mlp',
  'cnn',
  'polyreg',
  'ridge',
  'lasso',
  'dbscan',
  'hierarchical',
  'gmm',
  'pca',
  'tsne',
] as const;

const STEP_RE = /step\s+\d+\/\d+/;

async function readStepTotal(page: Page): Promise<number> {
  const txt = await page
    .getByText(STEP_RE)
    .first()
    .textContent()
    .catch(() => null);
  const m = txt?.match(/step\s+\d+\/(\d+)/);
  return m ? Number(m[1]) : 0;
}

for (const id of ALGORITHMS) {
  test(`smoke: ${id} produces steps and an explanation`, async ({ page }) => {
    await page.goto(`/workspace/${id}`);

    // Viz panel mounts immediately; the step indicator span is always present.
    await expect(page.getByText(STEP_RE).first()).toBeVisible({ timeout: 60_000 });

    // Pyodide cold-loads (~30s) then the controller auto-runs. If autorun didn't
    // kick in, the EmptyState offers a "Run now" button — click it and keep polling.
    await expect
      .poll(
        async () => {
          const runBtn = page.getByRole('button', { name: 'Run now' });
          if (await runBtn.isVisible().catch(() => false)) {
            await runBtn.click().catch(() => {});
          }
          return readStepTotal(page);
        },
        { timeout: 90_000, intervals: [1000, 2000, 3000, 5000] },
      )
      .toBeGreaterThan(0);

    // The explanation panel must show real content, not the empty placeholder.
    await expect(page.getByText("What's happening now")).toBeVisible();
    await expect(page.getByText('No events yet.')).toHaveCount(0);

    const explanation = page.locator('p.leading-relaxed.text-ink-200').first();
    await expect(explanation).toBeVisible();
    const text = (await explanation.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });
}
