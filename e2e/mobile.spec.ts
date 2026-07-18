import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile-responsiveness regression suite.
 *
 * Asserts the core acceptance criteria from the mobile-effectiveness pass:
 *  - No horizontal overflow (scrollWidth <= clientWidth) on the main public
 *    pages at the three mandated viewports: 360x640 (small Android), 390x844
 *    (iPhone 12/13/14), and 768px (tablet / small-laptop breakpoint boundary).
 *  - The workspace's code-editor + visualization layout stacks vertically
 *    (tabbed single-pane UX) below the `xl` breakpoint instead of forcing a
 *    side-by-side grid that would force pinch-zoom.
 *  - The D3 visualization panel renders with a real, usable height (it must
 *    not collapse toward 0px when sibling controls compete for space in a
 *    bounded flex column — see VizPanel.tsx's `min-h-fit` floor).
 *  - The D3 SVG resizes to its container width rather than using a fixed
 *    pixel size that would overflow a narrow viewport.
 */

const VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768px', width: 768, height: 1024 },
] as const;

const PAGES = ['/', '/learn', '/race'] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, 'document.documentElement.scrollWidth should not exceed clientWidth').toBeLessThanOrEqual(
    clientWidth,
  );
}

for (const viewport of VIEWPORTS) {
  test.describe(`mobile viewport ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of PAGES) {
      test(`no horizontal overflow on ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle').catch(() => {});
        await assertNoHorizontalOverflow(page);
      });
    }

    test('workspace: code + viz stack vertically (tabbed), no overflow', async ({ page }) => {
      await page.goto('/workspace/kmeans');

      // The step indicator is always present once VizPanel mounts.
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });
      await assertNoHorizontalOverflow(page);

      // Below the xl breakpoint the workspace renders a tabbed single-pane UX
      // (Visualize / Code / Tune) instead of a 3-column grid — Monaco and the
      // D3 viz are never forced side-by-side on narrow screens.
      const tabs = page.getByRole('tab');
      if (viewport.width < 1280) {
        await expect(tabs.filter({ hasText: 'Visualize' })).toBeVisible();
        await expect(tabs.filter({ hasText: 'Code' })).toBeVisible();
        await expect(tabs.filter({ hasText: 'Tune' })).toBeVisible();
      }

      // The D3 visualization container must render with a real, usable
      // height — not collapse to near-0px when sibling controls (challenge
      // banner, timeline scrubber) compete for space in the bounded flex
      // column. 200px is a conservative floor below the CSS `min-h-fit`
      // (~240px) intended value, leaving headroom for layout rounding.
      const vizBox = page.locator('div.relative.overflow-hidden.rounded-lg').first();
      await expect(vizBox).toBeVisible();
      const box = await vizBox.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThan(200);

      // Switch to the Code tab: Monaco must render without blowing out page
      // width.
      await tabs.filter({ hasText: 'Code' }).click();
      await expect(page.getByText('kmeans.py')).toBeVisible();
      await assertNoHorizontalOverflow(page);

      // Switch to the Tune tab: hyperparameter sliders/panels must not
      // overflow either.
      await tabs.filter({ hasText: 'Tune' }).click();
      await expect(page.getByText('Hyperparameters')).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });

    test('workspace D3 SVG scales to its container width, not a fixed pixel size', async ({ page }) => {
      await page.goto('/workspace/kmeans');
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });
      // The SVG paints once the first event's D3 draw call runs, a tick or
      // two after the step-counter text updates.
      await expect(page.locator('div.relative.overflow-hidden.rounded-lg svg').first()).toBeVisible({
        timeout: 60_000,
      });

      const svgWidth = await page.evaluate(() => {
        const container = document.querySelector('div.relative.overflow-hidden.rounded-lg');
        const svg = container?.querySelector('svg');
        return svg ? Number(svg.getAttribute('width')) : null;
      });
      const containerWidth = await page
        .locator('div.relative.overflow-hidden.rounded-lg')
        .first()
        .evaluate((el) => el.getBoundingClientRect().width);

      expect(svgWidth).not.toBeNull();
      // The SVG's rendered width should track the container (within padding
      // tolerance), never exceed it — proving it's driven by a
      // ResizeObserver rather than a fixed pixel constant that would
      // overflow a narrow viewport.
      expect(svgWidth as number).toBeLessThanOrEqual(containerWidth + 1);
      expect(svgWidth as number).toBeGreaterThan(containerWidth * 0.5);
    });

    test('workspace nav/algorithm-switcher is reachable and transport controls are tap-friendly', async ({
      page,
    }) => {
      await page.goto('/workspace/kmeans');
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });
      await assertNoHorizontalOverflow(page);

      // The algorithm switcher must be visible and reachable without
      // horizontal scrolling — no offscreen/clipped nav on narrow screens.
      const algorithmSwitcher = page.getByRole('combobox', { name: 'Algorithm' });
      await expect(algorithmSwitcher).toBeVisible();
      const switcherBox = await algorithmSwitcher.boundingBox();
      expect(switcherBox?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((switcherBox?.x ?? 0) + (switcherBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);

      // Playback/transport controls (step back/forward, play, reset, re-run)
      // must meet the ~44px minimum touch-target size established by the
      // `.touch-target` utility class.
      const controlNames = ['Step back', 'Step forward', 'Play', 'Reset'];
      for (const name of controlNames) {
        const control = page.getByRole('button', { name, exact: false }).first();
        const box = await control.boundingBox();
        expect(box?.height ?? 0, `${name} height`).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0, `${name} width`).toBeGreaterThanOrEqual(44);
      }

      // The Tune tab's per-parameter "Sweep" icon buttons must also meet the
      // touch-target floor (previously 24x24px, fixed to reuse `.touch-target`).
      await page.getByRole('tab', { name: 'Tune' }).click();
      await expect(page.getByText('Hyperparameters')).toBeVisible();
      const sweepButtons = page.getByRole('button', { name: /^Sweep /i });
      const sweepCount = await sweepButtons.count();
      expect(sweepCount).toBeGreaterThan(0);
      for (let i = 0; i < sweepCount; i++) {
        const box = await sweepButtons.nth(i).boundingBox();
        expect(box?.height ?? 0, `sweep button ${i} height`).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0, `sweep button ${i} width`).toBeGreaterThanOrEqual(44);
      }
      await assertNoHorizontalOverflow(page);
    });

    test('workspace: CNN sample strip + feature maps stack without overflow', async ({ page }) => {
      // CNN's viz has extra chrome (sample thumbnail strip, per-filter feature
      // maps) that classification/clustering workspaces don't — a good stress
      // test for the generic VizPanel/tab layout.
      await page.goto('/workspace/cnn');
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });
      await assertNoHorizontalOverflow(page);

      const tabs = page.getByRole('tab');
      if (viewport.width < 1280) {
        await expect(tabs.filter({ hasText: 'Visualize' })).toBeVisible();
      }
      // Let training run a step or two so the sample strip + feature maps
      // mount. The step-forward control is briefly disabled while the first
      // async pyodide/training step resolves, so wait for it to be enabled
      // before clicking rather than racing it (avoids a CI flake).
      const stepForward = page.getByRole('button', { name: /step forward/i }).first();
      await expect(stepForward).toBeEnabled({ timeout: 30_000 });
      await stepForward.click();
      await assertNoHorizontalOverflow(page);
    });

    test('workspace: MLP network diagram stacks without overflow', async ({ page }) => {
      await page.goto('/workspace/mlp');
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });
      await assertNoHorizontalOverflow(page);
    });

    test('ByoDataModal fits within viewport and closes via touch-friendly control', async ({ page }) => {
      await page.goto('/workspace/kmeans');
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });

      await page.getByRole('button', { name: /use your own data/i }).click();
      const dialog = page.getByRole('dialog', { name: /use your own data/i });
      await expect(dialog).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const box = await dialog.boundingBox();
      expect(box?.width ?? Infinity).toBeLessThanOrEqual(viewport.width);

      const closeBtn = page.getByRole('button', { name: 'Close' });
      const closeBox = await closeBtn.boundingBox();
      expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);

      await closeBtn.click();
      await expect(dialog).toBeHidden();
    });

    test('SweepDialog fits within viewport with sticky, tap-friendly footer', async ({ page }) => {
      await page.goto('/workspace/kmeans');
      await expect(page.getByText(/step\s+\d+\/\d+/).first()).toBeVisible({ timeout: 60_000 });

      await page.getByRole('tab', { name: 'Tune' }).click();
      await expect(page.getByText('Hyperparameters')).toBeVisible();
      await page.getByRole('button', { name: /^Sweep /i }).first().click();

      const dialog = page.getByRole('dialog', { name: /^Sweep/ });
      await expect(dialog).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const box = await dialog.boundingBox();
      expect(box?.width ?? Infinity).toBeLessThanOrEqual(viewport.width);

      const closeBtn = page.getByRole('button', { name: 'Close sweep dialog' });
      const closeBox = await closeBtn.boundingBox();
      expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);

      await closeBtn.click();
      await expect(dialog).toBeHidden();
    });
  });
}
