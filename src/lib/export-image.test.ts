import { describe, it, expect } from 'vitest';
import {
  readSvgSize,
  computeExportSize,
  serializeSvg,
  svgStringToDataUrl,
  pngFileName,
} from '@/lib/export-image';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeSvg(attrs: Record<string, string>): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
  return svg as SVGSVGElement;
}

describe('export-image · readSvgSize', () => {
  it('reads explicit width/height attributes', () => {
    expect(readSvgSize(makeSvg({ width: '300', height: '200' }))).toEqual({ width: 300, height: 200 });
  });

  it('strips px units', () => {
    expect(readSvgSize(makeSvg({ width: '320px', height: '240px' }))).toEqual({ width: 320, height: 240 });
  });

  it('falls back to the viewBox', () => {
    expect(readSvgSize(makeSvg({ viewBox: '0 0 800 600' }))).toEqual({ width: 800, height: 600 });
  });

  it('uses a default when nothing is measurable', () => {
    const size = readSvgSize(makeSvg({}));
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});

describe('export-image · computeExportSize', () => {
  it('applies the default 2x scale', () => {
    expect(computeExportSize({ width: 100, height: 50 })).toEqual({ width: 200, height: 100 });
  });

  it('respects a custom scale', () => {
    expect(computeExportSize({ width: 100, height: 50 }, { scale: 3 })).toEqual({ width: 300, height: 150 });
  });

  it('clamps the longest side while preserving aspect ratio', () => {
    const out = computeExportSize({ width: 4000, height: 2000 }, { scale: 2, maxDimension: 4096 });
    expect(Math.max(out.width, out.height)).toBe(4096);
    expect(out.width / out.height).toBeCloseTo(2, 5);
  });

  it('never returns a zero dimension', () => {
    const out = computeExportSize({ width: 0, height: 0 });
    expect(out.width).toBeGreaterThanOrEqual(1);
    expect(out.height).toBeGreaterThanOrEqual(1);
  });
});

describe('export-image · serializeSvg', () => {
  it('ensures the SVG namespace and explicit size', () => {
    const svg = makeSvg({ width: '120', height: '80' });
    const out = serializeSvg(svg);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('width="120"');
    expect(out).toContain('height="80"');
  });

  it('injects a background rect when requested', () => {
    const svg = makeSvg({ width: '120', height: '80' });
    const out = serializeSvg(svg, { background: '#123456' });
    expect(out).toContain('fill="#123456"');
    expect(out).toMatch(/<rect[^>]*width="120"[^>]*height="80"/);
  });

  it('does not mutate the source element', () => {
    const svg = makeSvg({ viewBox: '0 0 120 80' });
    serializeSvg(svg, { background: '#000000' });
    expect(svg.getAttribute('width')).toBeNull();
    expect(svg.querySelector('rect')).toBeNull();
  });
});

describe('export-image · svgStringToDataUrl', () => {
  it('produces an svg+xml data url', () => {
    const url = svgStringToDataUrl('<svg></svg>');
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(url).toContain(encodeURIComponent('<svg></svg>'));
  });
});

describe('export-image · pngFileName', () => {
  it('slugifies and appends .png', () => {
    expect(pngFileName('K-Means on Blobs')).toBe('k-means-on-blobs.png');
  });

  it('falls back when the prefix has no usable characters', () => {
    expect(pngFileName('   ')).toBe('visualization.png');
  });
});
