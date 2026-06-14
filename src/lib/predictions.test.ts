import { describe, it, expect } from 'vitest';
import type { TraceEvent } from '@/types/trace';
import type { AlgorithmId } from '@/types/algorithm';
import { getAlgorithm } from '@/algorithms/registry';
import {
  predictionFor,
  scorePrediction,
  accuracyBucketId,
  clusterBucketId,
  finalClusterCount,
  finalSlope,
} from './predictions';

const base = { explanation: '', math: '' };

/** Registry lookup that asserts the id resolves (every id used here is valid). */
function meta(id: AlgorithmId) {
  const m = getAlgorithm(id);
  if (!m) throw new Error(`missing algorithm ${id}`);
  return m;
}

// ─── predictionFor: which algorithms get which prediction ───────────────────

describe('predictionFor', () => {
  const accuracy: AlgorithmId[] = ['logreg', 'knn', 'naivebayes', 'svm', 'randomforest', 'gbm', 'mlp', 'cnn'];
  const regression: AlgorithmId[] = ['linreg', 'ridge', 'lasso', 'elasticnet'];
  const cluster: AlgorithmId[] = ['dbscan', 'hierarchical', 'gmm'];
  const none: AlgorithmId[] = ['kmeans', 'dtree', 'polyreg', 'pca', 'tsne', 'autoencoder', 'qlearning', 'dqn', 'reinforce', 'actorcritic'];

  it.each(accuracy)('offers an accuracy bucket for %s', (id) => {
    expect(predictionFor(meta(id))?.kind).toBe('accuracy-bucket');
  });

  it.each(regression)('offers a regression trend for %s', (id) => {
    expect(predictionFor(meta(id))?.kind).toBe('regression-trend');
  });

  it.each(cluster)('offers a cluster count for %s', (id) => {
    expect(predictionFor(meta(id))?.kind).toBe('cluster-count');
  });

  it.each(none)('offers no prediction for %s', (id) => {
    expect(predictionFor(meta(id))).toBeNull();
  });
});

// ─── Bucket boundary logic ──────────────────────────────────────────────────

describe('accuracyBucketId', () => {
  it('maps each band, lower-inclusive at the boundaries', () => {
    expect(accuracyBucketId(0)).toBe('lt60');
    expect(accuracyBucketId(0.59)).toBe('lt60');
    expect(accuracyBucketId(0.6)).toBe('60-80');
    expect(accuracyBucketId(0.79)).toBe('60-80');
    expect(accuracyBucketId(0.8)).toBe('80-95');
    expect(accuracyBucketId(0.94)).toBe('80-95');
    expect(accuracyBucketId(0.95)).toBe('gt95');
    expect(accuracyBucketId(1)).toBe('gt95');
  });
});

describe('clusterBucketId', () => {
  it('buckets the discovered count', () => {
    expect(clusterBucketId(1)).toBe('le2');
    expect(clusterBucketId(2)).toBe('le2');
    expect(clusterBucketId(3)).toBe('3');
    expect(clusterBucketId(4)).toBe('4');
    expect(clusterBucketId(5)).toBe('ge5');
    expect(clusterBucketId(9)).toBe('ge5');
  });
});

// ─── Metric extractors ──────────────────────────────────────────────────────

describe('finalClusterCount', () => {
  it('returns the last numClusters from cluster events', () => {
    const events = [
      { ...base, type: 'cluster:step', step: 0, label: '', labels: [], numClusters: 5 },
      { ...base, type: 'cluster:converged', step: 1, label: '', labels: [], numClusters: 3, reason: 'done' },
    ] as unknown as TraceEvent[];
    expect(finalClusterCount(events)).toBe(3);
  });

  it('returns null when no cluster event carried a count', () => {
    const events = [{ ...base, type: 'kmeans:init', step: 0, centroids: [] }] as unknown as TraceEvent[];
    expect(finalClusterCount(events)).toBeNull();
  });
});

describe('finalSlope', () => {
  it('reads w1 (first feature coefficient) from the last weighted step', () => {
    const events = [
      { ...base, type: 'linreg:init', step: 0, weights: [0.1, -0.2], loss: 1 },
      { ...base, type: 'linreg:step', step: 1, iteration: 0, weights: [0.3, 1.4], gradient: [], loss: 0.5, learningRate: 0.05 },
    ] as unknown as TraceEvent[];
    expect(finalSlope(events)).toBeCloseTo(1.4);
  });

  it('returns null when no weighted event was emitted', () => {
    const events = [{ ...base, type: 'cluster:converged', step: 0, label: '', labels: [], numClusters: 2, reason: '' }] as unknown as TraceEvent[];
    expect(finalSlope(events)).toBeNull();
  });
});

// ─── scorePrediction: hit / miss / edge per kind ────────────────────────────

function accuracyEvents(finalAccuracy: number): TraceEvent[] {
  return [
    { ...base, type: 'logreg:step', step: 0, weights: [], gradient: [], loss: 1, accuracy: 0.5, learningRate: 0.1 },
    { ...base, type: 'logreg:converged', step: 1, reason: 'tol', finalLoss: 0.2, finalAccuracy },
  ] as unknown as TraceEvent[];
}

describe('scorePrediction — accuracy bucket', () => {
  const spec = predictionFor(meta('logreg'))!;

  it('scores a correct bucket guess as a hit', () => {
    const result = scorePrediction(spec, '80-95', accuracyEvents(0.84));
    expect(result?.correct).toBe(true);
    expect(result?.resolution.actualChoiceId).toBe('80-95');
    expect(result?.resolution.actualLabel).toBe('84% accuracy');
    expect(result?.resolution.value).toBeCloseTo(0.84);
  });

  it('scores a wrong bucket guess as a miss', () => {
    const result = scorePrediction(spec, 'gt95', accuracyEvents(0.84));
    expect(result?.correct).toBe(false);
    expect(result?.resolution.actualChoiceId).toBe('80-95');
  });

  it('returns null when the run emitted no accuracy', () => {
    const events = [{ ...base, type: 'kmeans:init', step: 0, centroids: [] }] as unknown as TraceEvent[];
    expect(scorePrediction(spec, '80-95', events)).toBeNull();
  });
});

describe('scorePrediction — cluster count', () => {
  const spec = predictionFor(meta('dbscan'))!;

  function clusterEvents(numClusters: number): TraceEvent[] {
    return [
      { ...base, type: 'cluster:converged', step: 0, label: '', labels: [], numClusters, reason: 'done' },
    ] as unknown as TraceEvent[];
  }

  it('scores an exact count guess as a hit', () => {
    const result = scorePrediction(spec, '3', clusterEvents(3));
    expect(result?.correct).toBe(true);
    expect(result?.resolution.actualLabel).toBe('3 clusters');
  });

  it('buckets 5+ together as a hit', () => {
    const result = scorePrediction(spec, 'ge5', clusterEvents(7));
    expect(result?.correct).toBe(true);
  });

  it('scores a wrong count as a miss', () => {
    const result = scorePrediction(spec, '4', clusterEvents(2));
    expect(result?.correct).toBe(false);
    expect(result?.resolution.actualChoiceId).toBe('le2');
  });
});

describe('scorePrediction — regression trend', () => {
  const spec = predictionFor(meta('linreg'))!;

  function slopeEvents(slope: number): TraceEvent[] {
    return [
      { ...base, type: 'linreg:step', step: 0, iteration: 0, weights: [0, slope], gradient: [], loss: 0.1, learningRate: 0.05 },
    ] as unknown as TraceEvent[];
  }

  it('scores an upward guess as a hit for a positive slope', () => {
    const result = scorePrediction(spec, 'up', slopeEvents(1.2));
    expect(result?.correct).toBe(true);
    expect(result?.resolution.actualChoiceId).toBe('up');
  });

  it('scores a downward guess as a hit for a negative slope', () => {
    const result = scorePrediction(spec, 'down', slopeEvents(-0.7));
    expect(result?.correct).toBe(true);
    expect(result?.resolution.actualChoiceId).toBe('down');
  });

  it('treats a flat (zero) slope as upward', () => {
    const result = scorePrediction(spec, 'up', slopeEvents(0));
    expect(result?.correct).toBe(true);
  });

  it('scores the opposite trend as a miss', () => {
    const result = scorePrediction(spec, 'up', slopeEvents(-2));
    expect(result?.correct).toBe(false);
  });
});
