/**
 * Family-coded colour identity.
 *
 * Each of the four algorithm categories gets a distinct, accessible colour
 * scale so the workspace visually communicates which family of algorithm the
 * user is exploring:
 *
 *   supervised · classification   → azure
 *   supervised · regression       → amber
 *   unsupervised · clustering     → violet
 *   unsupervised · dim-reduction  → teal
 *   reinforcement                 → rose
 *
 * This module is intentionally PURE (no React, no registry import) so it can be
 * unit-tested in isolation and reused anywhere. Components resolve the palette
 * for the current algorithm and inject the `rgb` triplets as CSS custom
 * properties (`--family-*-rgb`), which the Tailwind `family-*` colour tokens
 * consume — giving every `family-*` utility full opacity-modifier support while
 * degrading gracefully to the default indigo accent when no family is set.
 *
 * All `text` shades meet WCAG AA (≥ 4.5:1) against the ink-900 background
 * (#0b0f1c); `accent`/`solid` shades meet the ≥ 3:1 bar for UI/graphical
 * elements. `assertContrast` + the accompanying unit test enforce this.
 */
import type { AlgorithmCategory } from '@/types/algorithm';

export type FamilyName = 'azure' | 'amber' | 'violet' | 'teal' | 'rose';

export interface FamilyShade {
  /** Hex string, e.g. "#7cc4ff". */
  hex: string;
  /** Space-separated sRGB triplet for `rgb(var(--x) / <alpha>)`, e.g. "124 196 255". */
  rgb: string;
}

export interface FamilyPalette {
  name: FamilyName;
  /** Short human label (used in tooltips / aria). */
  label: string;
  /** Light shade for text & labels on the dark background (WCAG AA ≥ 4.5:1). */
  text: FamilyShade;
  /** Mid shade for interactive accents, borders, focus rings (≥ 3:1). */
  accent: FamilyShade;
  /** Saturated fill for solid chips / markers. */
  solid: FamilyShade;
}

/** ink-900 — the app background every family colour is measured against. */
export const INK_900 = '#0b0f1c';

const shade = (hex: string): FamilyShade => ({ hex, rgb: hexToRgbTriplet(hex) });

export const FAMILY_PALETTES: Record<FamilyName, FamilyPalette> = {
  azure: {
    name: 'azure',
    label: 'Azure',
    text: shade('#7cc4ff'),
    accent: shade('#38a6f5'),
    solid: shade('#0e8fe6'),
  },
  amber: {
    name: 'amber',
    label: 'Amber',
    text: shade('#fcd34d'),
    accent: shade('#f5b014'),
    solid: shade('#e09112'),
  },
  violet: {
    name: 'violet',
    label: 'Violet',
    text: shade('#c4b5fd'),
    accent: shade('#a78bfa'),
    solid: shade('#8b5cf6'),
  },
  teal: {
    name: 'teal',
    label: 'Teal',
    text: shade('#5eead4'),
    accent: shade('#2dd4bf'),
    solid: shade('#14b8a6'),
  },
  rose: {
    name: 'rose',
    label: 'Rose',
    text: shade('#ff8fb3'),
    accent: shade('#f56a9b'),
    solid: shade('#e84d86'),
  },
};

const FAMILY_BY_CATEGORY: Record<AlgorithmCategory, FamilyName> = {
  'supervised-classification': 'azure',
  'supervised-regression': 'amber',
  'unsupervised-clustering': 'violet',
  'unsupervised-dim-reduction': 'teal',
  reinforcement: 'rose',
};

/** The family name for a category. */
export function familyForCategory(category: AlgorithmCategory): FamilyName {
  return FAMILY_BY_CATEGORY[category];
}

/** The full palette for a category. */
export function paletteForCategory(category: AlgorithmCategory): FamilyPalette {
  return FAMILY_PALETTES[familyForCategory(category)];
}

/**
 * CSS custom-property map to theme a subtree for a given category. Spread onto
 * an element's inline `style`. Consumed by the Tailwind `family-*` tokens.
 */
export function familyCssVars(category: AlgorithmCategory): Record<string, string> {
  const p = paletteForCategory(category);
  return {
    '--family-text-rgb': p.text.rgb,
    '--family-accent-rgb': p.accent.rgb,
    '--family-solid-rgb': p.solid.rgb,
  };
}

/* ───────────────────────── colour math (WCAG 2.x) ─────────────────────── */

/** Parse "#rrggbb" (or "#rgb") into an [r,g,b] tuple of 0–255 integers. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex colour: ${hex}`);
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** "#7cc4ff" → "124 196 255". */
export function hexToRgbTriplet(hex: string): string {
  return hexToRgb(hex).join(' ');
}

/** Relative luminance per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio (1–21) between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Throws if `fg` against `bg` falls below `min`. Used by the unit test. */
export function assertContrast(fg: string, bg: string, min: number): void {
  const ratio = contrastRatio(fg, bg);
  if (ratio < min) {
    throw new Error(`Contrast ${ratio.toFixed(2)}:1 for ${fg} on ${bg} < required ${min}:1`);
  }
}
