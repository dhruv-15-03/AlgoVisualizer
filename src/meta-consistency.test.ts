import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Vite `?raw` import: read VizRouter's source to count visual families without
// importing the heavy D3 viz components (same technique as registry.test.ts).
import vizRouterSource from '@/visualizations/VizRouter.tsx?raw';
import { listAlgorithms } from '@/algorithms/registry';
import { listDatasets } from '@/datasets/registry';
import { CATEGORY_ORDER } from '@/types/algorithm';

/**
 * Drift guard: public-facing copy must agree with the registry.
 *
 * Counts like "25 algorithms", "5 categories", "20 built-in datasets" and
 * "12 visual families" are duplicated across the README, the HTML metadata, the
 * runtime <title>/description, and the social card. They cannot import a shared
 * constant (they live in Markdown / HTML / SVG), so this test derives the real
 * numbers from the registry at runtime and asserts every surface still cites
 * them. Add an algorithm, dataset, or viz family and this fails until the copy
 * is updated — exactly once, here is the checklist of where.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (relPath: string) => readFileSync(resolve(root, relPath), 'utf8');

// Derived from the single sources of truth.
const algorithmCount = listAlgorithms().length;
const categoryCount = CATEGORY_ORDER.length;
// Built-in datasets only: the session store (custom/BYO datasets) is empty in
// the test environment, so listDatasets() returns just the built-ins.
const datasetCount = listDatasets().length;
// One `case` per renderable family in VizRouter's switch.
const familyCount = new Set(
  Array.from(vizRouterSource.matchAll(/case\s+'([^']+)':/g)).map((m) => m[1]),
).size;

describe('public copy stays in sync with the registry', () => {
  it('README cites the right algorithm, category, and dataset counts', () => {
    const readme = read('README.md');
    expect(
      readme,
      `README.md must say "${algorithmCount} algorithms across ${categoryCount} categories"`,
    ).toContain(`${algorithmCount} algorithms across ${categoryCount} categories`);
    expect(
      readme,
      `README.md must say "${datasetCount} built-in datasets"`,
    ).toContain(`${datasetCount} built-in datasets`);
  });

  it('index.html metadata cites the algorithm count', () => {
    const html = read('index.html');
    expect(
      html,
      `index.html (meta description + JSON-LD) must reference "${algorithmCount} algorithms"`,
    ).toContain(`${algorithmCount} algorithms`);
  });

  it('the runtime default description cites the algorithm count', () => {
    const page = read('src/pages/WorkspacePage.tsx');
    expect(
      page,
      `WorkspacePage default description must reference "${algorithmCount} algorithms"`,
    ).toContain(`${algorithmCount} algorithms`);
  });

  it('the social card cites the algorithm and family counts', () => {
    const og = read('scripts/assets/og-image.svg');
    expect(og, `og-image.svg must say "${algorithmCount} algorithms"`).toContain(
      `${algorithmCount} algorithms`,
    );
    expect(og, `og-image.svg must say "${familyCount} visual families"`).toContain(
      `${familyCount} visual families`,
    );
  });
});
