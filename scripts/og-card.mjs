/**
 * Pure (no native deps) helpers describing the per-algorithm Open Graph card.
 *
 * Kept separate from `generate-og-images.mjs` so the card content + URL/alt
 * contract can be unit-tested without loading satori / @resvg/resvg-js. The
 * generator turns `buildCardModel()` into an SVG (satori) then a PNG (resvg);
 * `prerender.mjs` uses `ogImageUrl()` / `ogImageAlt()` to point each algorithm
 * page at its own social card.
 */

/** Output sub-directory (under dist/) and per-id file naming. */
export const OG_SUBDIR = 'og';
export const OG_TAGLINE = 'Edit and run real Python in your browser — no install.';
export const OG_WORDMARK = 'AlgoVisualizer';

export function ogImageFileName(id) {
  return `${id}.png`;
}

/** Absolute URL a prerendered page should reference for its social card. */
export function ogImageUrl(origin, id) {
  return `${origin}/${OG_SUBDIR}/${ogImageFileName(id)}`;
}

export function ogImageAlt(meta) {
  return `${meta.name} — ${OG_WORDMARK}`;
}

/**
 * Title size shrinks for longer names so they stay on at most two lines within
 * the 1200×630 card.
 */
export function titleFontSize(name) {
  const n = String(name).length;
  if (n <= 18) return 78;
  if (n <= 26) return 64;
  if (n <= 34) return 54;
  return 46;
}

/** The literal text shown on the card, derived from the live registry meta. */
export function cardText(meta, categoryLabel) {
  return {
    wordmark: OG_WORDMARK,
    category: String(categoryLabel ?? '').toUpperCase(),
    title: meta.name,
    description: meta.shortDescription,
    footer: OG_TAGLINE,
  };
}

function div(style, children) {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

/**
 * Builds the satori element tree for one algorithm's 1200×630 card. Pure data —
 * no rendering — so it is safe to import in unit tests.
 */
export function buildCardModel(meta, categoryLabel) {
  const t = cardText(meta, categoryLabel);
  return div(
    {
      width: '1200px',
      height: '630px',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px',
      backgroundColor: '#0b1020',
      backgroundImage: 'radial-gradient(circle at 20% 0%, #1a2342 0%, #0b1020 55%)',
      fontFamily: 'Inter',
      color: '#e8ebf5',
      overflow: 'hidden',
    },
    [
      div({ alignItems: 'center', gap: '16px' }, [
        div({ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#4159e6' }, ''),
        div({ fontSize: '30px', fontWeight: 700, color: '#ffffff' }, t.wordmark),
      ]),
      div({ flexDirection: 'column', gap: '20px' }, [
        div({ fontSize: '26px', fontWeight: 600, letterSpacing: '4px', color: '#8aa0ff' }, t.category),
        div({ fontSize: `${titleFontSize(t.title)}px`, fontWeight: 700, color: '#ffffff', lineHeight: 1.05 }, t.title),
        div({ fontSize: '32px', color: '#b6c0da', lineHeight: 1.35, maxWidth: '960px' }, t.description),
      ]),
      div({ fontSize: '26px', color: '#8893ab' }, t.footer),
    ],
  );
}
