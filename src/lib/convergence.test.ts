import { describe, it, expect } from 'vitest';
import { extractConvergence, CONVERGENCE_MIN_POINTS } from '@/lib/convergence';
import type { TraceEvent } from '@/types/trace';

const base = (step: number, iteration?: number) => ({
  step,
  ...(iteration === undefined ? {} : { iteration }),
  explanation: '',
  math: '',
});

describe('convergence.extractConvergence', () => {
  it('extracts a loss series from gradient-descent steps', () => {
    const events = [
      { ...base(0, 0), type: 'linreg:init', weights: [0], loss: 5 },
      { ...base(1, 1), type: 'linreg:step', weights: [0.1], gradient: [1], loss: 3, learningRate: 0.1 },
      { ...base(2, 2), type: 'linreg:step', weights: [0.2], gradient: [1], loss: 1.5, learningRate: 0.1 },
    ] as TraceEvent[];
    const series = extractConvergence(events);
    expect(series).not.toBeNull();
    expect(series!.label).toBe('Loss');
    expect(series!.yAxisLabel).toBe('Loss');
    expect(series!.points).toEqual([
      { iteration: 0, loss: 5 },
      { iteration: 1, loss: 3 },
      { iteration: 2, loss: 1.5 },
    ]);
  });

  it('extracts inertia for k-means', () => {
    const events = [
      { ...base(0, 0), type: 'kmeans:init', centroids: [[0, 0]] },
      { ...base(1, 0), type: 'kmeans:assign', labels: [0], inertia: 10 },
      { ...base(2, 1), type: 'kmeans:update', centroids: [[1, 1]], moved: 1, inertia: 6 },
    ] as TraceEvent[];
    const series = extractConvergence(events);
    expect(series!.label).toBe('Inertia');
    expect(series!.points.map((p) => p.loss)).toEqual([10, 6]);
  });

  it('extracts ensemble accuracy for random forest', () => {
    const grown = (i: number, acc: number) =>
      ({
        ...base(i),
        type: 'forest:tree_grown',
        treeIndex: i,
        totalTrees: 3,
        treeSummary: { nodes: 1, leaves: 1, depth: 1 },
        ensembleAccuracy: acc,
      }) as TraceEvent;
    const series = extractConvergence([grown(0, 0.6), grown(1, 0.7), grown(2, 0.8)]);
    expect(series!.label).toBe('Accuracy');
    // No `iteration` field → falls back to running index.
    expect(series!.points).toEqual([
      { iteration: 0, loss: 0.6 },
      { iteration: 1, loss: 0.7 },
      { iteration: 2, loss: 0.8 },
    ]);
  });

  it('uses metricLabel for clustering steps', () => {
    const events = [
      { ...base(0, 0), type: 'cluster:step', label: 'GMM', labels: [0], metric: -5, metricLabel: 'Log-likelihood' },
      { ...base(1, 1), type: 'cluster:step', label: 'GMM', labels: [0], metric: -3, metricLabel: 'Log-likelihood' },
    ] as TraceEvent[];
    const series = extractConvergence(events);
    expect(series!.label).toBe('Log-likelihood');
    expect(series!.points.map((p) => p.loss)).toEqual([-5, -3]);
  });

  it('ignores boundary steps without a loss (e.g. KNN)', () => {
    const events = [
      { ...base(0, 0), type: 'boundary:step', label: 'KNN', grid: [0], gridSize: 1, bbox: [0, 1, 0, 1] },
      { ...base(1, 1), type: 'boundary:step', label: 'KNN', grid: [0], gridSize: 1, bbox: [0, 1, 0, 1] },
    ] as TraceEvent[];
    expect(extractConvergence(events)).toBeNull();
  });

  it('includes boundary loss when present (e.g. SVM)', () => {
    const events = [
      { ...base(0, 0), type: 'boundary:step', label: 'SVM', grid: [0], gridSize: 1, bbox: [0, 1, 0, 1], loss: 2 },
      { ...base(1, 1), type: 'boundary:step', label: 'SVM', grid: [0], gridSize: 1, bbox: [0, 1, 0, 1], loss: 1 },
    ] as TraceEvent[];
    const series = extractConvergence(events);
    expect(series!.points.map((p) => p.loss)).toEqual([2, 1]);
  });

  it('returns null for a non-iterative tree builder', () => {
    const events = [
      { ...base(0), type: 'dtree:open', node: {} as never },
      { ...base(1), type: 'dtree:done', totalNodes: 3, totalLeaves: 2, maxDepthReached: 2 },
    ] as TraceEvent[];
    expect(extractConvergence(events)).toBeNull();
  });

  it('returns null below the minimum point count', () => {
    const events = [
      { ...base(0, 0), type: 'linreg:init', weights: [0], loss: 5 },
    ] as TraceEvent[];
    expect(extractConvergence(events)).toBeNull();
    expect(CONVERGENCE_MIN_POINTS).toBe(2);
  });

  it('returns null for an empty trace', () => {
    expect(extractConvergence([])).toBeNull();
  });
});
