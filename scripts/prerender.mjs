/**
 * Prerenders one crawlable HTML page per algorithm into
 * `dist/workspace/<id>/index.html`.
 *
 * Why: the app is a client-rendered SPA, so search engines and link unfurlers
 * see an empty `<div id="root">` plus the global meta. This script clones the
 * built `dist/index.html` (which already references the hashed `/assets/*`
 * bundles) and, per algorithm, swaps in a focused <title>/description/canonical,
 * Open Graph + Twitter tags, a LearningResource JSON-LD block, and a chunk of
 * real, indexable content inside the root node. On the client, React's
 * `createRoot().render()` clears that node and boots the real app — so there's
 * no hydration mismatch, just better SEO + social previews.
 *
 * Vercel serves a matching file from the filesystem before applying the SPA
 * rewrite, so `/workspace/knn` resolves to this static page and then the SPA
 * takes over.
 *
 * The algorithm data is read from the live registry (bundled on the fly with
 * esbuild), so this never drifts from the app.
 *
 * Run: `node scripts/prerender.mjs` (chained after `vite build`).
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadRegistry } from './load-registry.mjs';
import { ogImageUrl, ogImageAlt } from './og-card.mjs';
import { seoTitle, seoDescription, breadcrumbList } from './seo-meta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');
const ORIGIN = 'https://algo-visualizer-beige.vercel.app';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceOnce(html, regex, replacement, label) {
  if (!regex.test(html)) {
    throw new Error(`prerender: could not find ${label} in dist/index.html`);
  }
  return html.replace(regex, replacement);
}

function crawlableContent(meta, categoryLabel) {
  const pros = meta.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  const cons = meta.cons.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
  const refs = (meta.references ?? [])
    .map(
      (r) =>
        `<li><a href="${escapeHtml(r.url)}" rel="noopener noreferrer">${escapeHtml(r.label)}</a></li>`,
    )
    .join('');
  return [
    '<main>',
    `<nav><a href="/">AlgoVisualizer</a> › ${escapeHtml(categoryLabel)}</nav>`,
    `<h1>${escapeHtml(meta.name)}</h1>`,
    `<p>${escapeHtml(meta.shortDescription)}</p>`,
    `<p>${escapeHtml(meta.longDescription)}</p>`,
    `<p>Edit and run real Python for ${escapeHtml(meta.name)} in your browser and watch it train step by step — no install, no setup.</p>`,
    `<dl><dt>Time complexity</dt><dd>${escapeHtml(meta.timeComplexity)}</dd>` +
      `<dt>Space complexity</dt><dd>${escapeHtml(meta.spaceComplexity)}</dd></dl>`,
    pros ? `<h2>Strengths</h2><ul>${pros}</ul>` : '',
    cons ? `<h2>Limitations</h2><ul>${cons}</ul>` : '',
    refs ? `<h2>References</h2><ul>${refs}</ul>` : '',
    `<p><a href="/workspace/${escapeHtml(meta.id)}">Open the ${escapeHtml(meta.name)} workspace</a></p>`,
    '</main>',
  ].join('');
}

function jsonLd(meta) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: meta.name,
    description: meta.shortDescription,
    url: `${ORIGIN}/workspace/${meta.id}`,
    learningResourceType: 'interactive visualization',
    educationalUse: 'self-study, demonstration',
    isAccessibleForFree: true,
    inLanguage: 'en',
    about: { '@type': 'Thing', name: meta.name },
    isPartOf: { '@type': 'WebSite', name: 'AlgoVisualizer', url: `${ORIGIN}/` },
  };
  return jsonLdScript(data);
}

/** Serialize a structured-data object into a safe <script> block. */
function jsonLdScript(data) {
  // Escape `<` to keep the JSON from prematurely closing the script element.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function renderPage(template, meta, categoryLabel) {
  const url = `${ORIGIN}/workspace/${meta.id}`;
  const title = seoTitle(meta);
  const description = seoDescription(meta);
  let html = template;

  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`, 'title');
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    'description meta',
  );
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    'canonical link',
  );
  html = replaceOnce(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    'og:url',
  );
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    'og:title',
  );
  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    'og:description',
  );
  html = replaceOnce(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    'twitter:title',
  );
  html = replaceOnce(
    html,
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    'twitter:description',
  );

  const ogImage = ogImageUrl(ORIGIN, meta.id);
  const ogAlt = ogImageAlt(meta);
  html = replaceOnce(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    'og:image',
  );
  html = replaceOnce(
    html,
    /<meta property="og:image:alt" content="[^"]*"\s*\/?>/,
    `<meta property="og:image:alt" content="${escapeHtml(ogAlt)}" />`,
    'og:image:alt',
  );
  html = replaceOnce(
    html,
    /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    'twitter:image',
  );

  const breadcrumb = jsonLdScript(breadcrumbList(meta, categoryLabel, ORIGIN));
  html = replaceOnce(html, /<\/head>/, `${jsonLd(meta)}${breadcrumb}</head>`, 'head close');
  html = replaceOnce(
    html,
    /<div id="root">\s*<\/div>/,
    `<div id="root">${crawlableContent(meta, categoryLabel)}</div>`,
    'root node',
  );

  return html;
}

const LEARN_URL = `${ORIGIN}/learn`;
const LEARN_TITLE = 'Learn Machine Learning — Interactive Lessons in Python';
const LEARN_DESCRIPTION =
  'Free guided ML lessons that run real Python in your browser. Work through linear ' +
  'regression, logistic regression, decision trees, k-NN, k-means and PCA step by step.';

function learnCrawlableContent(paths) {
  const sections = paths
    .map((path) => {
      const lessons = path.lessons
        .map(
          (l) =>
            `<li><a href="/workspace/${escapeHtml(l.algorithmId)}">${escapeHtml(l.title)}</a> — ${escapeHtml(l.blurb)}</li>`,
        )
        .join('');
      return [
        '<section>',
        `<h2>${escapeHtml(path.title)}</h2>`,
        `<p>${escapeHtml(path.summary)}</p>`,
        `<p>${escapeHtml(path.estimate)} · ${path.lessons.length} lessons</p>`,
        `<ol>${lessons}</ol>`,
        '</section>',
      ].join('');
    })
    .join('');
  return [
    '<main>',
    '<nav><a href="/">AlgoVisualizer</a> › Learn</nav>',
    '<h1>Learn Machine Learning — Interactive Lessons</h1>',
    `<p>${escapeHtml(LEARN_DESCRIPTION)}</p>`,
    '<p>Every lesson runs real Python in your browser and is complete when you beat its challenge — no install, no setup.</p>',
    sections,
    '<p><a href="/learn">Start learning</a></p>',
    '</main>',
  ].join('');
}

function learnStructuredData(paths) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AlgoVisualizer learning paths',
    url: LEARN_URL,
    itemListElement: paths.map((path, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: path.title,
        description: path.summary,
        url: LEARN_URL,
        inLanguage: 'en',
        isAccessibleForFree: true,
        provider: { '@type': 'Organization', name: 'AlgoVisualizer', url: `${ORIGIN}/` },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: path.estimate,
        },
      },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AlgoVisualizer', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Learn', item: LEARN_URL },
    ],
  };
  return `${jsonLdScript(itemList)}${jsonLdScript(breadcrumb)}`;
}

function renderLearnPage(template, paths) {
  let html = template;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(LEARN_TITLE)}</title>`, 'title');
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(LEARN_DESCRIPTION)}" />`,
    'description meta',
  );
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(LEARN_URL)}" />`,
    'canonical link',
  );
  html = replaceOnce(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeHtml(LEARN_URL)}" />`,
    'og:url',
  );
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtml(LEARN_TITLE)}" />`,
    'og:title',
  );
  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtml(LEARN_DESCRIPTION)}" />`,
    'og:description',
  );
  html = replaceOnce(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(LEARN_TITLE)}" />`,
    'twitter:title',
  );
  html = replaceOnce(
    html,
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(LEARN_DESCRIPTION)}" />`,
    'twitter:description',
  );
  html = replaceOnce(html, /<\/head>/, `${learnStructuredData(paths)}</head>`, 'head close');
  html = replaceOnce(
    html,
    /<div id="root">\s*<\/div>/,
    `<div id="root">${learnCrawlableContent(paths)}</div>`,
    'root node',
  );
  return html;
}

async function main() {
  const templatePath = resolve(distDir, 'index.html');
  if (!existsSync(templatePath)) {
    throw new Error('prerender: dist/index.html not found — run `vite build` first.');
  }
  const template = readFileSync(templatePath, 'utf8');
  const { listAlgorithms, CATEGORY_LABELS, listLearningPaths } = await loadRegistry();
  const algorithms = listAlgorithms();

  let count = 0;
  for (const meta of algorithms) {
    const categoryLabel = CATEGORY_LABELS[meta.category] ?? '';
    const html = renderPage(template, meta, categoryLabel);
    const outDir = resolve(distDir, 'workspace', meta.id);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
    count += 1;
  }

  const learnHtml = renderLearnPage(template, listLearningPaths());
  const learnDir = resolve(distDir, 'learn');
  mkdirSync(learnDir, { recursive: true });
  writeFileSync(resolve(learnDir, 'index.html'), learnHtml, 'utf8');

  console.log(
    `Prerendered ${count} algorithm page(s) into dist/workspace/<id>/index.html + dist/learn/index.html`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
