import { describe, it, expect } from 'vitest';
import {
  drawnPointsToDataset,
  isFarEnough,
  DRAW_DRAG_MIN_DISTANCE,
  DRAW_MIN_POINTS,
  type DrawnPoint,
} from '@/lib/draw-points';

const pts = (specs: Array<[number, number, number]>): DrawnPoint[] =>
  specs.map(([x, y, label]) => ({ x, y, label }));

const many = (label: number, n = DRAW_MIN_POINTS): DrawnPoint[] =>
  Array.from({ length: n }, (_, i) => ({ x: i, y: i * 2, label }));

describe('draw-points', () => {
  it('builds a clustering dataset (no labels)', () => {
    const r = drawnPointsToDataset(many(0), { id: 'd', name: 'D', task: 'clustering' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.y).toBeNull();
    expect(r.dataset.task).toBe('clustering');
    expect(r.dataset.featureNames).toEqual(['x', 'y']);
    expect(r.dataset.X.length).toBe(DRAW_MIN_POINTS);
    expect(r.dataset.source).toBe('BYO');
  });

  it('builds a classification dataset with dense, remapped class indices', () => {
    // Use palette slots 2 and 5; expect remap to 0 and 1.
    const points = [
      ...pts([[0, 0, 2], [1, 1, 2]]),
      ...pts([[2, 2, 5], [3, 3, 5]]),
    ];
    const r = drawnPointsToDataset(points, {
      id: 'c',
      name: 'C',
      task: 'classification',
      classNames: ['A', 'B', 'C', 'D', 'E', 'F'],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.y).toEqual([0, 0, 1, 1]);
    expect(r.dataset.classNames).toEqual(['C', 'F']);
  });

  it('rejects too few points', () => {
    const r = drawnPointsToDataset(many(0, DRAW_MIN_POINTS - 1), {
      id: 'd',
      name: 'D',
      task: 'clustering',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/at least/i);
  });

  it('rejects classification with a single class', () => {
    const r = drawnPointsToDataset(many(0), { id: 'c', name: 'C', task: 'classification' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/2 classes/i);
  });

  it('rejects non-finite coordinates', () => {
    const points = [
      { x: 0, y: 0, label: 0 },
      { x: Number.NaN, y: 1, label: 1 },
      { x: 2, y: 2, label: 0 },
      { x: 3, y: 3, label: 1 },
    ];
    const r = drawnPointsToDataset(points, { id: 'c', name: 'C', task: 'classification' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/finite/i);
  });

  it('falls back to default class names when none provided', () => {
    const points = pts([[0, 0, 0], [1, 1, 0], [2, 2, 1], [3, 3, 1]]);
    const r = drawnPointsToDataset(points, { id: 'c', name: 'C', task: 'classification' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.classNames).toEqual(['Class 1', 'Class 2']);
  });
});

describe('isFarEnough (drag throttle)', () => {
  it('always places the first point of a stroke (no previous point)', () => {
    expect(isFarEnough(null, { x: 5, y: 5 })).toBe(true);
  });

  it('rejects a point closer than the minimum distance', () => {
    expect(isFarEnough({ x: 0, y: 0 }, { x: DRAW_DRAG_MIN_DISTANCE - 1, y: 0 })).toBe(false);
  });

  it('accepts a point at or beyond the minimum distance', () => {
    expect(isFarEnough({ x: 0, y: 0 }, { x: DRAW_DRAG_MIN_DISTANCE, y: 0 })).toBe(true);
  });

  it('measures Euclidean (diagonal) distance, not per-axis', () => {
    // 3-4-5 triangle → distance exactly 5.
    expect(isFarEnough({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
    expect(isFarEnough({ x: 0, y: 0 }, { x: 3, y: 4 }, 6)).toBe(false);
  });
});
