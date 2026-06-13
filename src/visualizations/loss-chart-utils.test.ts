import { describe, it, expect } from 'vitest';
import { lossChartDomains, nearestLossIndex, type LossPoint } from './loss-chart-utils';

const series = (vals: Array<[number, number]>): LossPoint[] =>
  vals.map(([iteration, loss]) => ({ iteration, loss }));

describe('lossChartDomains', () => {
  it('returns a unit box for an empty series', () => {
    expect(lossChartDomains([])).toEqual({ x: [0, 1], y: [0, 1] });
  });

  it('spans the iteration extent on x', () => {
    const { x } = lossChartDomains(series([[0, 5], [3, 2], [7, 1]]));
    expect(x).toEqual([0, 7]);
  });

  it('widens x when all iterations are identical', () => {
    const { x } = lossChartDomains(series([[4, 1], [4, 0.5]]));
    expect(x).toEqual([4, 5]);
  });

  it('pads the loss extent on y by ~8%', () => {
    const { y } = lossChartDomains(series([[0, 0], [1, 10]]));
    // span 10 -> pad 0.8
    expect(y[0]).toBeCloseTo(-0.8, 6);
    expect(y[1]).toBeCloseTo(10.8, 6);
  });

  it('gives a flat series a visible band', () => {
    const { y } = lossChartDomains(series([[0, 2], [1, 2], [2, 2]]));
    expect(y[0]).toBeLessThan(2);
    expect(y[1]).toBeGreaterThan(2);
  });

  it('ignores non-finite losses when computing the y extent', () => {
    const { y } = lossChartDomains(series([[0, 1], [1, Number.NaN], [2, 3]]));
    expect(Number.isFinite(y[0])).toBe(true);
    expect(Number.isFinite(y[1])).toBe(true);
    expect(y[0]).toBeLessThan(1);
    expect(y[1]).toBeGreaterThan(3);
  });
});

describe('nearestLossIndex', () => {
  const data = series([[0, 9], [5, 4], [10, 1]]);

  it('returns -1 for an empty series', () => {
    expect(nearestLossIndex([], 3)).toBe(-1);
  });

  it('snaps to the closest iteration', () => {
    expect(nearestLossIndex(data, 0)).toBe(0);
    expect(nearestLossIndex(data, 4)).toBe(1);
    expect(nearestLossIndex(data, 9)).toBe(2);
  });

  it('clamps beyond the right edge to the last point', () => {
    expect(nearestLossIndex(data, 999)).toBe(2);
  });

  it('resolves ties to the earlier point', () => {
    // 2.5 is equidistant from iterations 0 and 5 -> earlier wins.
    expect(nearestLossIndex(data, 2.5)).toBe(0);
  });
});
