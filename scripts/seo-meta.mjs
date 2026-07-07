/**
 * Pure, dependency-free helpers that synthesize search-optimized <title> and
 * <meta name="description"> text plus a BreadcrumbList JSON-LD object for each
 * prerendered algorithm page.
 *
 * Kept separate from `prerender.mjs` so the title/description/breadcrumb
 * contract can be unit-tested (see `src/algorithms/seo-meta.test.ts`) without
 * running a full build. All functions are deterministic and derive only from
 * the live registry meta, so they never drift from the app.
 *
 * SEO rationale:
 *  - Titles front-load the head keyword (the algorithm name) and append the
 *    modifiers people actually search for ("Visualizer", "Interactive", the
 *    task, "Python"), bounded to ~62 chars so Google doesn't truncate them.
 *  - Parentheticals (e.g. "(Gradient Descent)") are stripped from the title
 *    head because nobody searches them and they waste the character budget.
 *  - Descriptions reuse the registry's one-line summary and append a short,
 *    consistent value-prop hook, bounded to ~160 chars.
 */

/** Longest title suffix; used when the name is short enough to fit it. */
const TITLE_SUFFIX_LONG = ' Visualizer — Interactive ML in Python';
/** Fallback suffix for longer names. */
const TITLE_SUFFIX_SHORT = ' Visualizer — Interactive ML';
/** Last-resort suffix for very long names. */
const TITLE_SUFFIX_TINY = ' — Interactive Visualizer';

/** Consistent value-prop appended to descriptions when it fits. */
export const DESCRIPTION_HOOK = 'Edit and run real Python in your browser — no install.';

export const SEO_TITLE_MAX = 62;
export const SEO_DESCRIPTION_MAX = 160;

/**
 * Strips parenthetical qualifiers and collapses whitespace, e.g.
 * "Logistic Regression (Gradient Descent)" -> "Logistic Regression".
 */
export function seoName(name) {
  return String(name)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A keyword-front-loaded, length-bounded page title for an algorithm.
 * Picks the richest suffix that keeps the whole title within `maxLen`.
 */
export function seoTitle(meta, maxLen = SEO_TITLE_MAX) {
  const base = seoName(meta.name);
  for (const suffix of [TITLE_SUFFIX_LONG, TITLE_SUFFIX_SHORT, TITLE_SUFFIX_TINY]) {
    const candidate = `${base}${suffix}`;
    if (candidate.length <= maxLen) return candidate;
  }
  const bare = `${base} Visualizer`;
  return bare.length <= maxLen ? bare : base.slice(0, maxLen).trim();
}

/**
 * A meta description: the registry summary plus a consistent hook when it fits,
 * otherwise the summary (truncated with an ellipsis only if it alone is long).
 */
export function seoDescription(meta, maxLen = SEO_DESCRIPTION_MAX) {
  const base = String(meta.shortDescription).trim();
  const joiner = base.endsWith('.') ? ' ' : '. ';
  const combined = `${base}${joiner}${DESCRIPTION_HOOK}`;
  if (combined.length <= maxLen) return combined;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * BreadcrumbList structured data (Home › Category › Algorithm). The category
 * crumb is unlinked because there is no standalone category page; Google
 * accepts ListItems without an `item` for non-final positions.
 */
export function breadcrumbList(meta, categoryLabel, origin) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'AlgoVisualizer', item: `${origin}/` }];
  let position = 2;
  if (categoryLabel) {
    items.push({ '@type': 'ListItem', position, name: String(categoryLabel) });
    position += 1;
  }
  items.push({
    '@type': 'ListItem',
    position,
    name: meta.name,
    item: `${origin}/workspace/${meta.id}`,
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}
