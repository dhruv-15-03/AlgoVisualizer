/**
 * Generates public/sitemap.xml.
 *
 * Self-contained (no TS import) so it runs under plain Node. The algorithm id
 * list mirrors src/lib/sitemap.ts; a unit test (sitemap.test.ts) drift-checks
 * that list against the live registry, so this script staying in sync is
 * enforced by CI rather than by a fragile build-time TS import.
 *
 * Run: `node scripts/generate-sitemap.mjs`
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE_ORIGIN = 'https://algo-visualizer-beige.vercel.app';

const ALGORITHM_IDS = [
  'logreg',
  'knn',
  'naivebayes',
  'svm',
  'dtree',
  'randomforest',
  'mlp',
  'cnn',
  'linreg',
  'polyreg',
  'ridge',
  'lasso',
  'kmeans',
  'dbscan',
  'hierarchical',
  'gmm',
  'pca',
  'tsne',
];

function xmlEscape(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urls() {
  const list = [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'weekly', priority: 1.0 },
    { loc: `${SITE_ORIGIN}/race`, changefreq: 'monthly', priority: 0.7 },
  ];
  for (const id of ALGORITHM_IDS) {
    list.push({ loc: `${SITE_ORIGIN}/workspace/${id}`, changefreq: 'monthly', priority: 0.8 });
  }
  return list;
}

function buildSitemap() {
  const body = urls()
    .map((u) => {
      const parts = [`    <loc>${xmlEscape(u.loc)}</loc>`];
      parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '..', 'public', 'sitemap.xml');
writeFileSync(outPath, buildSitemap(), 'utf8');
console.log(`Wrote ${outPath} (${urls().length} URLs)`);
