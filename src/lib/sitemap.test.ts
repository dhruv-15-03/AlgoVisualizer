import { describe, it, expect } from 'vitest';
import {
  buildSitemap,
  sitemapUrls,
  SITEMAP_ALGORITHM_IDS,
  SITE_ORIGIN,
} from './sitemap';
import { listAlgorithms } from '@/algorithms/registry';

describe('SITEMAP_ALGORITHM_IDS', () => {
  it('covers exactly the algorithm registry (drift guard)', () => {
    const registryIds = listAlgorithms()
      .map((a) => a.id)
      .sort();
    const sitemapIds = [...SITEMAP_ALGORITHM_IDS].sort();
    expect(sitemapIds).toEqual(registryIds);
  });

  it('has no duplicate ids', () => {
    expect(new Set(SITEMAP_ALGORITHM_IDS).size).toBe(SITEMAP_ALGORITHM_IDS.length);
  });
});

describe('sitemapUrls', () => {
  it('emits home + race + learn + every workspace route', () => {
    const urls = sitemapUrls();
    expect(urls).toHaveLength(3 + SITEMAP_ALGORITHM_IDS.length);
    expect(urls[0].loc).toBe(`${SITE_ORIGIN}/`);
    expect(urls[1].loc).toBe(`${SITE_ORIGIN}/race`);
    expect(urls[2].loc).toBe(`${SITE_ORIGIN}/learn`);
    expect(urls.some((u) => u.loc === `${SITE_ORIGIN}/workspace/kmeans`)).toBe(true);
  });

  it('strips a trailing slash from the base url', () => {
    const urls = sitemapUrls('https://example.com/');
    expect(urls[0].loc).toBe('https://example.com/');
    expect(urls[1].loc).toBe('https://example.com/race');
  });
});

describe('buildSitemap', () => {
  it('produces a valid urlset with one <loc> per route', () => {
    const xml = buildSitemap();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('<urlset');
    const locCount = (xml.match(/<loc>/g) ?? []).length;
    expect(locCount).toBe(3 + SITEMAP_ALGORITHM_IDS.length);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/workspace/tsne</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/learn</loc>`);
  });

  it('is deterministic for stable input', () => {
    expect(buildSitemap()).toBe(buildSitemap());
  });
});
