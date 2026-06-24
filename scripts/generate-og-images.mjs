/**
 * Generates one 1200×630 Open Graph social card per algorithm into
 * `dist/og/<id>.png`.
 *
 * Why: the SPA shipped a single generic `og-image.png` for all 25 algorithm
 * pages, so every shared workspace link unfurled with the same card. This
 * renders a focused, branded card per algorithm (name, category, one-line
 * description) so shared links look distinct and inviting.
 *
 * How: satori turns the pure element tree from `og-card.mjs` into an SVG using
 * embedded Inter (woff, from the pinned @fontsource/inter devDep — deterministic
 * across machines and CI), then @resvg/resvg-js rasterizes it to PNG. No headless
 * browser; fully reproducible. The algorithm list comes from the live registry
 * (via esbuild), so new algorithms get a card automatically.
 *
 * `prerender.mjs` points each page's og:image / twitter:image at the matching
 * file. Vercel serves `/og/<id>.png` from the filesystem before the SPA rewrite.
 *
 * Run: `node scripts/generate-og-images.mjs` (chained after `vite build`, before
 * `prerender.mjs`).
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadRegistry } from './load-registry.mjs';
import { buildCardModel, ogImageFileName, OG_SUBDIR } from './og-card.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');
const fontsDir = resolve(root, 'node_modules/@fontsource/inter/files');

/** Embed Inter directly from the pinned devDep so rendering is identical everywhere. */
function loadFonts() {
  const read = (weight) => readFileSync(resolve(fontsDir, `inter-latin-${weight}-normal.woff`));
  return [
    { name: 'Inter', data: read(400), weight: 400, style: 'normal' },
    { name: 'Inter', data: read(600), weight: 600, style: 'normal' },
    { name: 'Inter', data: read(700), weight: 700, style: 'normal' },
  ];
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error('generate-og-images: dist/ not found — run `vite build` first.');
  }
  const fonts = loadFonts();
  const { listAlgorithms, CATEGORY_LABELS } = await loadRegistry();
  const algorithms = listAlgorithms();

  const outDir = resolve(distDir, OG_SUBDIR);
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const meta of algorithms) {
    const categoryLabel = CATEGORY_LABELS[meta.category] ?? '';
    const svg = await satori(buildCardModel(meta, categoryLabel), { width: 1200, height: 630, fonts });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    writeFileSync(resolve(outDir, ogImageFileName(meta.id)), png);
    count += 1;
  }

  console.log(`Generated ${count} Open Graph image(s) into dist/${OG_SUBDIR}/<id>.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
