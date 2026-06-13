import { describe, it, expect } from 'vitest';
import { generateConfetti } from './confetti';

describe('generateConfetti', () => {
  it('produces the requested number of pieces', () => {
    expect(generateConfetti({ count: 10 })).toHaveLength(10);
    expect(generateConfetti({ count: 0 })).toHaveLength(0);
  });

  it('defaults to a sensible non-empty burst', () => {
    const pieces = generateConfetti();
    expect(pieces.length).toBeGreaterThan(0);
  });

  it('is deterministic for a given seed', () => {
    expect(generateConfetti({ seed: 42 })).toEqual(generateConfetti({ seed: 42 }));
  });

  it('varies output across seeds', () => {
    const a = generateConfetti({ seed: 1 });
    const b = generateConfetti({ seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('keeps every piece within sane bounds', () => {
    const spread = 140;
    const fall = 220;
    for (const p of generateConfetti({ count: 60, seed: 7, spread, fall })) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(100);
      expect(Math.abs(p.dx)).toBeLessThanOrEqual(spread);
      expect(p.dy).toBeGreaterThan(0);
      expect(p.dy).toBeLessThanOrEqual(fall * 1.2 + 1);
      expect(p.size).toBeGreaterThanOrEqual(5);
      expect(p.duration).toBeGreaterThan(0);
      expect(p.delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('samples only from the provided colors', () => {
    const colors = ['#111111', '#222222'];
    for (const p of generateConfetti({ count: 20, colors })) {
      expect(colors).toContain(p.color);
    }
  });

  it('falls back to defaults when given an empty color list', () => {
    const pieces = generateConfetti({ count: 5, colors: [] });
    expect(pieces.every((p) => /^#[0-9a-f]{6}$/i.test(p.color))).toBe(true);
  });

  it('assigns sequential ids', () => {
    const pieces = generateConfetti({ count: 5, seed: 3 });
    expect(pieces.map((p) => p.id)).toEqual([0, 1, 2, 3, 4]);
  });
});
