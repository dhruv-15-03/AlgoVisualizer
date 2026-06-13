import { describe, it, expect } from 'vitest';
import type { TraceEvent } from '@/types/trace';
import {
  bestAccuracy,
  countUntilConverged,
  decisionTreeLeaves,
  explainedVariance,
  challengesFor,
  listChallenges,
} from './challenges';

const base = { explanation: '', math: '' };

describe('bestAccuracy', () => {
  it('returns null when no accuracy is present', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'kmeans:init', step: 0, centroids: [] },
    ];
    expect(bestAccuracy(events)).toBeNull();
  });

  it('takes the maximum across step and converged events', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'logreg:step', step: 0, weights: [], gradient: [], loss: 1, accuracy: 0.7, learningRate: 0.1 },
      { ...base, type: 'logreg:step', step: 1, weights: [], gradient: [], loss: 0.5, accuracy: 0.85, learningRate: 0.1 },
      { ...base, type: 'logreg:converged', step: 2, reason: 'tol', finalLoss: 0.4, finalAccuracy: 0.91 },
    ];
    expect(bestAccuracy(events)).toBeCloseTo(0.91);
  });

  it('reads ensembleAccuracy from forest events', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'forest:tree_grown', step: 0, treeIndex: 0, totalTrees: 3, treeSummary: { nodes: 1, leaves: 1, depth: 1 }, ensembleAccuracy: 0.88 },
    ];
    expect(bestAccuracy(events)).toBeCloseTo(0.88);
  });
});

describe('countUntilConverged', () => {
  it('counts steps before the converged event', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'linreg:step', step: 0, weights: [], gradient: [], loss: 1, learningRate: 0.1 },
      { ...base, type: 'linreg:step', step: 1, weights: [], gradient: [], loss: 0.5, learningRate: 0.1 },
      { ...base, type: 'linreg:converged', step: 2, reason: 'tol', finalLoss: 0.4 },
      { ...base, type: 'linreg:step', step: 3, weights: [], gradient: [], loss: 0.3, learningRate: 0.1 },
    ];
    expect(countUntilConverged(events, 'linreg:step', 'linreg:converged')).toEqual({
      steps: 2,
      converged: true,
    });
  });

  it('reports not converged and counts all matching steps', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'kmeans:update', step: 0, centroids: [], moved: 2, inertia: 5 },
      { ...base, type: 'kmeans:update', step: 1, centroids: [], moved: 1, inertia: 4 },
    ];
    expect(countUntilConverged(events, 'kmeans:update', 'kmeans:converged')).toEqual({
      steps: 2,
      converged: false,
    });
  });
});

describe('decisionTreeLeaves', () => {
  it('returns null without a done event', () => {
    expect(decisionTreeLeaves([])).toBeNull();
  });
  it('returns totalLeaves from the done event', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'dtree:done', step: 0, totalNodes: 7, totalLeaves: 4, maxDepthReached: 3 },
    ];
    expect(decisionTreeLeaves(events)).toBe(4);
  });
});

describe('explainedVariance', () => {
  it('sums the per-component variance from the converged event', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'projection:converged', step: 0, label: 'PCA', projected: [], varianceExplained: [0.6, 0.28], reason: 'done' },
    ];
    expect(explainedVariance(events)).toBeCloseTo(0.88);
  });
  it('falls back to a step event', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'projection:step', step: 0, label: 'PCA', projected: [], varianceExplained: [0.5, 0.2] },
    ];
    expect(explainedVariance(events)).toBeCloseTo(0.7);
  });
  it('returns null when absent', () => {
    expect(explainedVariance([])).toBeNull();
  });
});

describe('challenge evaluators', () => {
  it('marks logreg met when accuracy clears the bar', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'logreg:converged', step: 0, reason: 'tol', finalLoss: 0.2, finalAccuracy: 0.93 },
    ];
    const [challenge] = challengesFor('logreg');
    const outcome = challenge.evaluate(events);
    expect(outcome.status).toBe('met');
    expect(outcome.progress).toBe(1);
    expect(outcome.value).toBeCloseTo(0.93);
  });

  it('marks logreg unmet when accuracy is below the bar', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'logreg:converged', step: 0, reason: 'tol', finalLoss: 0.5, finalAccuracy: 0.72 },
    ];
    const outcome = challengesFor('logreg')[0].evaluate(events);
    expect(outcome.status).toBe('unmet');
    expect(outcome.progress).toBeGreaterThan(0);
    expect(outcome.progress).toBeLessThan(1);
  });

  it('is pending before any events arrive', () => {
    expect(challengesFor('logreg')[0].evaluate([]).status).toBe('pending');
  });

  it('marks kmeans met only when it converged within budget', () => {
    const updates: TraceEvent[] = Array.from({ length: 5 }, (_, i) => ({
      ...base, type: 'kmeans:update' as const, step: i, centroids: [], moved: 1, inertia: 10 - i,
    }));
    const converged: TraceEvent = { ...base, type: 'kmeans:converged', step: 5, reason: 'stable' };
    const outcome = challengesFor('kmeans')[0].evaluate([...updates, converged]);
    expect(outcome.status).toBe('met');
    expect(outcome.value).toBe(5);
  });

  it('keeps kmeans pending if it never converged', () => {
    const updates: TraceEvent[] = Array.from({ length: 12 }, (_, i) => ({
      ...base, type: 'kmeans:update' as const, step: i, centroids: [], moved: 1, inertia: 1,
    }));
    expect(challengesFor('kmeans')[0].evaluate(updates).status).toBe('pending');
  });

  it('marks a compact decision tree as met', () => {
    const events: TraceEvent[] = [
      { ...base, type: 'dtree:done', step: 0, totalNodes: 15, totalLeaves: 8, maxDepthReached: 4 },
    ];
    const outcome = challengesFor('dtree')[0].evaluate(events);
    expect(outcome.status).toBe('met');
  });

  it('defines exactly one challenge per covered algorithm', () => {
    expect(listChallenges()).toHaveLength(6);
    for (const id of ['logreg', 'knn', 'kmeans', 'linreg', 'dtree', 'pca'] as const) {
      expect(challengesFor(id)).toHaveLength(1);
    }
    expect(challengesFor('tsne')).toHaveLength(0);
  });
});
