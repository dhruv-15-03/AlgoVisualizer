import { describe, it, expect } from 'vitest';
import { describeTraceEvent, announceForStep } from '@/lib/step-announcer';
import type { TraceEvent } from '@/types/trace';

/** Build an event with the base fields filled in. */
function ev(e: { type: TraceEvent['type'] } & Record<string, unknown>): TraceEvent {
  return { step: 0, explanation: '', math: '', ...e } as TraceEvent;
}

describe('step-announcer.describeTraceEvent', () => {
  it('K-means: init / assign / update / converged', () => {
    expect(
      describeTraceEvent(ev({ type: 'kmeans:init', centroids: [[0, 0], [1, 1], [2, 2]] }), 0, 5),
    ).toBe('K-means: placed 3 initial centroids.');
    expect(
      describeTraceEvent(ev({ type: 'kmeans:assign', labels: [0, 1], inertia: 0.42 }), 1, 5),
    ).toBe('K-means: reassigning points to the nearest centroid. Inertia 0.42.');
    expect(
      describeTraceEvent(ev({ type: 'kmeans:update', centroids: [[0, 0]], moved: 1, inertia: 0.3 }), 2, 5),
    ).toBe('K-means: moved 1 centroid. Inertia 0.3.');
    expect(
      describeTraceEvent(ev({ type: 'kmeans:converged', reason: 'Centroids stable.' }), 4, 5),
    ).toBe('K-means converged. Centroids stable.');
  });

  it('Linear regression: includes iteration and loss', () => {
    expect(
      describeTraceEvent(
        ev({ type: 'linreg:step', iteration: 7, weights: [0, 1], gradient: [0], loss: 0.42, learningRate: 0.1 }),
        7,
        50,
      ),
    ).toBe('Linear regression — iteration 7. Loss 0.42.');
    expect(
      describeTraceEvent(ev({ type: 'linreg:init', weights: [0], loss: 1.5 }), 0, 50),
    ).toBe('Linear regression: starting gradient descent. Loss 1.5.');
    expect(
      describeTraceEvent(
        ev({ type: 'linreg:converged', reason: 'Gradient below tolerance.', finalLoss: 0.01 }),
        49,
        50,
      ),
    ).toBe('Linear regression converged. Final loss 0.01. Gradient below tolerance.');
  });

  it('Logistic regression: formats accuracy as a percentage', () => {
    expect(
      describeTraceEvent(
        ev({ type: 'logreg:step', iteration: 3, weights: [0], gradient: [0], loss: 0.5, accuracy: 0.92, learningRate: 0.1 }),
        3,
        20,
      ),
    ).toBe('Logistic regression — iteration 3. Loss 0.5, accuracy 92%.');
  });

  it('falls back to step number when no iteration is present', () => {
    expect(
      describeTraceEvent(ev({ type: 'mlp:step', layers: [2, 2], weights: [], loss: 0.2, accuracy: 0.8, learningRate: 0.1 }), 4, 10),
    ).toBe('Neural network — step 5. Loss 0.2, accuracy 80%.');
  });

  it('Decision tree: split announces feature and threshold', () => {
    const child = {
      id: 'n1',
      parentId: 'root',
      branch: 'left' as const,
      depth: 1,
      sampleIndices: [],
      classCounts: {},
      prediction: null,
      gini: 0,
    };
    expect(
      describeTraceEvent(
        ev({
          type: 'dtree:split',
          nodeId: 'root',
          feature: 0,
          featureName: 'petal length',
          threshold: 2.45,
          giniBefore: 0.5,
          giniLeft: 0.1,
          giniRight: 0.2,
          leftChild: child,
          rightChild: { ...child, branch: 'right' },
        }),
        2,
        9,
      ),
    ).toBe('Decision tree: splitting on petal length at threshold 2.45.');
  });

  it('Boundary: accuracy appears when present, generic otherwise', () => {
    expect(
      describeTraceEvent(
        ev({ type: 'boundary:step', label: 'KNN(k=5)', grid: [], gridSize: 0, bbox: [0, 1, 0, 1], accuracy: 0.88 }),
        1,
        4,
      ),
    ).toBe('KNN(k=5): updating the decision boundary — accuracy 88%.');
    expect(
      describeTraceEvent(
        ev({ type: 'boundary:converged', label: 'KNN(k=5)', reason: 'Fitted.', finalAccuracy: 0.9 }),
        3,
        4,
      ),
    ).toBe('KNN(k=5) finished. Final accuracy 90%. Fitted.');
  });

  it('Random forest: 1-based tree index', () => {
    expect(
      describeTraceEvent(
        ev({
          type: 'forest:tree_grown',
          treeIndex: 0,
          totalTrees: 10,
          treeSummary: { nodes: 3, leaves: 2, depth: 1 },
          ensembleAccuracy: 0.7,
        }),
        0,
        10,
      ),
    ).toBe('Random forest: grew tree 1 of 10. Ensemble accuracy 70%.');
  });

  it('Universal lifecycle: error and finished', () => {
    expect(describeTraceEvent(ev({ type: 'error', message: 'boom' }), 0, 1)).toBe('Error: boom');
    expect(describeTraceEvent(ev({ type: 'finished', totalSteps: 42 }), 0, 1)).toBe(
      'Run finished after 42 steps.',
    );
  });
});

describe('step-announcer.announceForStep', () => {
  it('returns empty string when there are no events', () => {
    expect(announceForStep([], 0)).toBe('');
  });

  it('returns the sentence for the current step', () => {
    const events: TraceEvent[] = [
      ev({ type: 'kmeans:init', centroids: [[0, 0]] }),
      ev({ type: 'kmeans:assign', labels: [0], inertia: 1 }),
    ];
    expect(announceForStep(events, 1)).toBe(
      'K-means: reassigning points to the nearest centroid. Inertia 1.',
    );
  });

  it('clamps an out-of-range currentStep', () => {
    const events: TraceEvent[] = [ev({ type: 'kmeans:init', centroids: [[0, 0]] })];
    expect(announceForStep(events, 99)).toBe('K-means: placed 1 initial centroids.');
    expect(announceForStep(events, -5)).toBe('K-means: placed 1 initial centroids.');
  });
});
