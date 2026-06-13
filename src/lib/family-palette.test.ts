import { describe, it, expect } from 'vitest';
import { CATEGORY_ORDER } from '@/types/algorithm';
import {
  FAMILY_PALETTES,
  INK_900,
  familyForCategory,
  paletteForCategory,
  familyCssVars,
  hexToRgb,
  hexToRgbTriplet,
  contrastRatio,
  relativeLuminance,
  assertContrast,
} from './family-palette';

describe('familyForCategory', () => {
  it('maps each category to its distinct family', () => {
    expect(familyForCategory('supervised-classification')).toBe('azure');
    expect(familyForCategory('supervised-regression')).toBe('amber');
    expect(familyForCategory('unsupervised-clustering')).toBe('violet');
    expect(familyForCategory('unsupervised-dim-reduction')).toBe('teal');
    expect(familyForCategory('reinforcement')).toBe('rose');
  });

  it('covers every category in CATEGORY_ORDER with a palette', () => {
    for (const cat of CATEGORY_ORDER) {
      const p = paletteForCategory(cat);
      expect(p).toBeTruthy();
      expect(p.text.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('assigns a unique family to each category (no collisions)', () => {
    const names = CATEGORY_ORDER.map(familyForCategory);
    expect(new Set(names).size).toBe(CATEGORY_ORDER.length);
  });
});

describe('hex parsing', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#7cc4ff')).toEqual([124, 196, 255]);
  });
  it('expands 3-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });
  it('produces a space-separated triplet', () => {
    expect(hexToRgbTriplet('#0e8fe6')).toBe('14 143 230');
  });
  it('rejects invalid hex', () => {
    expect(() => hexToRgb('not-a-color')).toThrow();
  });
  it('keeps shade.rgb consistent with shade.hex', () => {
    for (const p of Object.values(FAMILY_PALETTES)) {
      for (const s of [p.text, p.accent, p.solid]) {
        expect(s.rgb).toBe(hexToRgbTriplet(s.hex));
      }
    }
  });
});

describe('WCAG contrast against ink-900', () => {
  it('every family text shade meets AA normal text (>= 4.5:1)', () => {
    for (const p of Object.values(FAMILY_PALETTES)) {
      expect(contrastRatio(p.text.hex, INK_900)).toBeGreaterThanOrEqual(4.5);
      expect(() => assertContrast(p.text.hex, INK_900, 4.5)).not.toThrow();
    }
  });

  it('every family accent and solid shade meets AA UI/graphics (>= 3:1)', () => {
    for (const p of Object.values(FAMILY_PALETTES)) {
      expect(contrastRatio(p.accent.hex, INK_900)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(p.solid.hex, INK_900)).toBeGreaterThanOrEqual(3);
    }
  });

  it('contrast ratio is symmetric and bounded 1..21', () => {
    const r = contrastRatio('#ffffff', '#000000');
    expect(r).toBeCloseTo(21, 0);
    expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 5);
  });

  it('luminance is ordered (white brightest, black darkest)', () => {
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(relativeLuminance('#7cc4ff'));
    expect(relativeLuminance('#000000')).toBeLessThan(relativeLuminance('#0b0f1c'));
  });
});

describe('familyCssVars', () => {
  it('returns the three family rgb custom properties', () => {
    const vars = familyCssVars('supervised-classification');
    expect(vars).toEqual({
      '--family-text-rgb': FAMILY_PALETTES.azure.text.rgb,
      '--family-accent-rgb': FAMILY_PALETTES.azure.accent.rgb,
      '--family-solid-rgb': FAMILY_PALETTES.azure.solid.rgb,
    });
  });
});
