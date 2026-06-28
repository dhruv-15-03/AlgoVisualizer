import { describe, it, expect } from 'vitest';
import { listAlgorithms } from './registry';
import { CATEGORY_LABELS } from '@/types/algorithm';
import {
  buildCardModel,
  cardText,
  titleFontSize,
  ogImageFileName,
  ogImageUrl,
  ogImageAlt,
  OG_SUBDIR,
} from '../../scripts/og-card.mjs';

const algorithms = listAlgorithms();

describe('per-algorithm Open Graph cards', () => {
  it('covers all 25 algorithms', () => {
    expect(algorithms).toHaveLength(25);
  });

  it('builds a complete, on-brand card for every algorithm', () => {
    for (const meta of algorithms) {
      const label = CATEGORY_LABELS[meta.category];
      expect(label, `missing category label for ${meta.category}`).toBeTruthy();

      const t = cardText(meta, label);
      expect(t.title).toBe(meta.name);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.category).toBe(label.toUpperCase());
      expect(t.description).toBe(meta.shortDescription);
      expect(t.description.length).toBeGreaterThan(0);

      const size = titleFontSize(meta.name);
      expect(size).toBeGreaterThanOrEqual(40);
      expect(size).toBeLessThanOrEqual(80);

      const model = buildCardModel(meta, label);
      expect(model.type).toBe('div');
    }
  });

  it('points each algorithm page at its own social card', () => {
    for (const meta of algorithms) {
      expect(ogImageFileName(meta.id)).toBe(`${meta.id}.png`);
      expect(ogImageUrl('https://example.test', meta.id)).toBe(
        `https://example.test/${OG_SUBDIR}/${meta.id}.png`,
      );
      expect(ogImageAlt(meta)).toContain(meta.name);
    }
  });

  it('uses unique, URL-safe algorithm ids', () => {
    const ids = algorithms.map((m) => m.id);
    for (const id of ids) {
      expect(id, `id "${id}" must be url-safe`).toMatch(/^[a-z0-9-]+$/);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('scales the title down for longer names', () => {
    expect(titleFontSize('DBSCAN')).toBe(78);
    expect(titleFontSize('Principal Component Analysis')).toBe(54);
    expect(titleFontSize('A'.repeat(40))).toBe(46);
  });
});
