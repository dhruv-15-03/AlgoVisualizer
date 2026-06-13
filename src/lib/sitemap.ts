/**
 * Sitemap generation.
 *
 * `buildSitemap` is a pure function so it can be unit tested and reused by the
 * build-time generator script (`scripts/generate-sitemap.mjs`) that writes
 * `public/sitemap.xml`.
 *
 * `SITEMAP_ALGORITHM_IDS` is the canonical list of workspace routes. A unit
 * test drift-checks it against the live algorithm registry so a newly added
 * algorithm can't silently fall out of the sitemap.
 */

import type { AlgorithmId } from '@/types/algorithm';

/** Production origin (no trailing slash). */
export const SITE_ORIGIN = 'https://algo-visualizer-beige.vercel.app';

/** Algorithm ids that get a `/workspace/<id>` URL, in registry order. */
export const SITEMAP_ALGORITHM_IDS: AlgorithmId[] = [
  'logreg',
  'knn',
  'naivebayes',
  'svm',
  'dtree',
  'randomforest',
  'gbm',
  'mlp',
  'cnn',
  'linreg',
  'polyreg',
  'ridge',
  'lasso',
  'elasticnet',
  'kmeans',
  'dbscan',
  'hierarchical',
  'gmm',
  'pca',
  'tsne',
  'autoencoder',
  'qlearning',
  'dqn',
  'reinforce',
  'actorcritic',
];

export interface SitemapUrl {
  loc: string;
  changefreq?: string;
  priority?: number;
}

/** Build the ordered list of sitemap URLs for a given origin. */
export function sitemapUrls(
  baseUrl: string = SITE_ORIGIN,
  ids: readonly AlgorithmId[] = SITEMAP_ALGORITHM_IDS,
): SitemapUrl[] {
  const origin = baseUrl.replace(/\/+$/, '');
  const urls: SitemapUrl[] = [
    { loc: `${origin}/`, changefreq: 'weekly', priority: 1.0 },
    { loc: `${origin}/race`, changefreq: 'monthly', priority: 0.7 },
  ];
  for (const id of ids) {
    urls.push({ loc: `${origin}/workspace/${id}`, changefreq: 'monthly', priority: 0.8 });
  }
  return urls;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Render a complete sitemap.xml document string. */
export function buildSitemap(
  baseUrl: string = SITE_ORIGIN,
  ids: readonly AlgorithmId[] = SITEMAP_ALGORITHM_IDS,
): string {
  const urls = sitemapUrls(baseUrl, ids);
  const body = urls
    .map((u) => {
      const parts = [`    <loc>${xmlEscape(u.loc)}</loc>`];
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (typeof u.priority === 'number') {
        parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
