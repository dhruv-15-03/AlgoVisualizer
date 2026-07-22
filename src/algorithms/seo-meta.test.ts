import { describe, it, expect } from 'vitest';
import { listAlgorithms } from './registry';
import { CATEGORY_LABELS } from '@/types/algorithm';
import {
  seoName,
  seoTitle,
  seoDescription,
  breadcrumbList,
  DESCRIPTION_HOOK,
  SEO_TITLE_MAX,
  SEO_DESCRIPTION_MAX,
} from '../../scripts/seo-meta.mjs';

const algorithms = listAlgorithms();
const ORIGIN = 'https://algo-visualizer-beige.vercel.app';

describe('seoName', () => {
  it('strips parenthetical qualifiers and collapses whitespace', () => {
    expect(seoName('Logistic Regression (Gradient Descent)')).toBe('Logistic Regression');
    expect(seoName('Linear Regression (Gradient Descent)')).toBe('Linear Regression');
  });

  it('leaves names without parentheticals unchanged', () => {
    expect(seoName('K-Means')).toBe('K-Means');
    expect(seoName('Decision Tree')).toBe('Decision Tree');
  });
});

describe('seoTitle', () => {
  it('covers all 25 algorithms', () => {
    expect(algorithms).toHaveLength(25);
  });

  for (const meta of algorithms) {
    describe(meta.id, () => {
      const title = seoTitle(meta);

      it('stays within the SERP-safe length budget', () => {
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
      });

      it('front-loads the (paren-stripped) algorithm name', () => {
        expect(title.startsWith(seoName(meta.name))).toBe(true);
      });

      it('includes the "Visualizer" keyword', () => {
        expect(title).toContain('Visualizer');
      });

      it('drops parenthetical qualifiers', () => {
        expect(title).not.toContain('(');
      });
    });
  }

  it('is deterministic', () => {
    expect(seoTitle(algorithms[0])).toBe(seoTitle(algorithms[0]));
  });

  it('falls back gracefully for an unrealistically long name', () => {
    const meta = { id: 'x', name: 'A'.repeat(120), shortDescription: 'x' };
    expect(seoTitle(meta).length).toBeLessThanOrEqual(SEO_TITLE_MAX);
  });
});

describe('seoDescription', () => {
  for (const meta of algorithms) {
    describe(meta.id, () => {
      const description = seoDescription(meta);

      it('stays within the SERP-safe length budget', () => {
        expect(description.length).toBeGreaterThan(0);
        expect(description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
      });

      it('starts from the registry summary', () => {
        expect(description.startsWith(meta.shortDescription.trim().slice(0, 20))).toBe(true);
      });
    });
  }

  it('appends the value-prop hook when it fits', () => {
    const meta = { id: 'x', name: 'X', shortDescription: 'A short summary.' };
    expect(seoDescription(meta)).toContain(DESCRIPTION_HOOK);
  });

  it('omits the hook and truncates when the summary alone is very long', () => {
    const meta = { id: 'x', name: 'X', shortDescription: 'word '.repeat(60).trim() };
    const out = seoDescription(meta);
    expect(out.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    expect(out).not.toContain(DESCRIPTION_HOOK);
  });
});

describe('breadcrumbList', () => {
  it('builds an ordered Home › Category › Algorithm trail', () => {
    const meta = algorithms.find((a) => a.id === 'kmeans')!;
    const label = CATEGORY_LABELS[meta.category];
    const crumb = breadcrumbList(meta, label, ORIGIN);

    expect(crumb['@type']).toBe('BreadcrumbList');
    const items = crumb.itemListElement;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ position: 1, name: 'AlgoVisualizer', item: `${ORIGIN}/` });
    expect(items[1]).toMatchObject({ position: 2, name: label });
    expect(items[2]).toMatchObject({
      position: 3,
      name: meta.name,
      item: `${ORIGIN}/workspace/kmeans`,
    });
  });

  it('positions are contiguous starting at 1', () => {
    for (const meta of algorithms) {
      const items = breadcrumbList(meta, CATEGORY_LABELS[meta.category], ORIGIN).itemListElement;
      items.forEach((item, i) => expect(item.position).toBe(i + 1));
    }
  });
});
