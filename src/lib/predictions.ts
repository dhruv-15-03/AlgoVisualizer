/**
 * Predict-then-reveal (Tier 11) — pure scoring logic.
 *
 * Before a learner clicks Run they make a quick prediction about the outcome;
 * after the run finishes we reveal the ACTUAL value and score the guess. This
 * module is the pure, deterministic heart of that feature: given an algorithm
 * and the emitted trace events, it knows which prediction to ask and how to
 * resolve the real answer.
 *
 * It is intentionally free of React, Zustand, randomness, and side-effects
 * (localStorage streaks live in the UI layer) so every branch is unit-testable
 * and decoupled from the rest of the app — the same contract the challenges
 * module follows. Predictions ALWAYS score against fields the Python algorithms
 * actually emit (final accuracy, discovered cluster count, fitted slope), never
 * invented numbers.
 */
import type { TraceEvent } from '@/types/trace';
import type { AlgorithmId, AlgorithmMeta } from '@/types/algorithm';
import { bestAccuracy } from '@/lib/challenges';

export type PredictionKind = 'accuracy-bucket' | 'cluster-count' | 'regression-trend';

export interface PredictionChoice {
  /** Stable id compared against the resolved actual outcome. */
  id: string;
  /** Short button label shown to the learner. */
  label: string;
}

/** The outcome of a finished run, derived purely from its trace events. */
export interface PredictionResolution {
  /** The choice id that reality matched (i.e. the correct answer). */
  actualChoiceId: string;
  /** Human label for the actual outcome, e.g. "84% accuracy". */
  actualLabel: string;
  /** One-line plain-English why, suitable for non-native readers. */
  explanation: string;
  /** Raw measured number (accuracy 0–1, cluster count, or slope). */
  value: number;
}

export interface PredictionSpec {
  kind: PredictionKind;
  /** The question shown to the learner. */
  question: string;
  /** Ordered choice buttons (fully partition the outcome space). */
  choices: PredictionChoice[];
  /**
   * Pure: resolve the real outcome from a finished run's events. Returns null
   * when the run produced no measurable signal (e.g. it errored before
   * emitting a result), so the UI can degrade gracefully instead of scoring
   * against a missing value.
   */
  resolve: (events: TraceEvent[]) => PredictionResolution | null;
}

export interface PredictionScore {
  correct: boolean;
  resolution: PredictionResolution;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// ─── Metric extractors (pure) ───────────────────────────────────────────────

/**
 * Final number of clusters the algorithm settled on. DBSCAN / hierarchical /
 * GMM emit `numClusters` on their cluster events; we take the last value seen
 * (the converged one when present). Returns null if no cluster event carried a
 * count.
 */
export function finalClusterCount(events: TraceEvent[]): number | null {
  let count: number | null = null;
  for (const e of events) {
    const ev = e as unknown as Record<string, unknown>;
    if (
      typeof ev.type === 'string' &&
      ev.type.startsWith('cluster:') &&
      typeof ev.numClusters === 'number' &&
      Number.isFinite(ev.numClusters)
    ) {
      count = ev.numClusters;
    }
  }
  return count;
}

/**
 * Slope of the fitted line for a linear-family regressor. The Python algos
 * (linreg / ridge / lasso / elasticnet) emit `weights = [bias, w1, …]` on every
 * step; `w1` is the coefficient on the first feature — exactly the slope the
 * regression viz draws. We read the last step's value. Returns null if no
 * weighted event was emitted.
 */
export function finalSlope(events: TraceEvent[]): number | null {
  let slope: number | null = null;
  for (const e of events) {
    const ev = e as unknown as Record<string, unknown>;
    const w = ev.weights;
    if (Array.isArray(w) && w.length >= 2 && typeof w[1] === 'number' && Number.isFinite(w[1])) {
      slope = w[1];
    }
  }
  return slope;
}

// ─── Accuracy buckets ───────────────────────────────────────────────────────

const ACCURACY_BUCKETS: { id: string; label: string; ceiling: number }[] = [
  { id: 'lt60', label: 'Below 60%', ceiling: 0.6 },
  { id: '60-80', label: '60–80%', ceiling: 0.8 },
  { id: '80-95', label: '80–95%', ceiling: 0.95 },
  { id: 'gt95', label: 'Above 95%', ceiling: Infinity },
];

/** Map an accuracy in 0–1 to its bucket id. Boundaries are lower-inclusive. */
export function accuracyBucketId(accuracy: number): string {
  for (const b of ACCURACY_BUCKETS) {
    if (accuracy < b.ceiling) return b.id;
  }
  return ACCURACY_BUCKETS[ACCURACY_BUCKETS.length - 1].id;
}

const CLUSTER_CHOICES: PredictionChoice[] = [
  { id: 'le2', label: '2 or fewer' },
  { id: '3', label: '3 clusters' },
  { id: '4', label: '4 clusters' },
  { id: 'ge5', label: '5 or more' },
];

/** Map a discovered cluster count to its choice bucket id. */
export function clusterBucketId(count: number): string {
  if (count <= 2) return 'le2';
  if (count === 3) return '3';
  if (count === 4) return '4';
  return 'ge5';
}

// ─── Spec builders ──────────────────────────────────────────────────────────

function accuracySpec(): PredictionSpec {
  return {
    kind: 'accuracy-bucket',
    question: 'How accurate will this model get?',
    choices: ACCURACY_BUCKETS.map((b) => ({ id: b.id, label: b.label })),
    resolve(events) {
      const acc = bestAccuracy(events);
      if (acc === null) return null;
      const pct = Math.round(acc * 100);
      return {
        actualChoiceId: accuracyBucketId(acc),
        actualLabel: `${pct}% accuracy`,
        explanation: `The model reached ${pct}% accuracy on this dataset.`,
        value: acc,
      };
    },
  };
}

function clusterSpec(): PredictionSpec {
  return {
    kind: 'cluster-count',
    question: 'How many clusters will it find?',
    choices: CLUSTER_CHOICES,
    resolve(events) {
      const n = finalClusterCount(events);
      if (n === null) return null;
      const noun = n === 1 ? 'cluster' : 'clusters';
      return {
        actualChoiceId: clusterBucketId(n),
        actualLabel: `${n} ${noun}`,
        explanation: `The algorithm settled on ${n} ${noun}.`,
        value: n,
      };
    },
  };
}

function regressionSpec(): PredictionSpec {
  return {
    kind: 'regression-trend',
    question: 'Which way will the fitted line trend?',
    choices: [
      { id: 'up', label: 'Trends upward' },
      { id: 'down', label: 'Trends downward' },
    ],
    resolve(events) {
      const slope = finalSlope(events);
      if (slope === null) return null;
      const up = slope >= 0;
      const shown = `${slope >= 0 ? '+' : ''}${round(slope, 2)}`;
      return {
        actualChoiceId: up ? 'up' : 'down',
        actualLabel: `slope ${shown}`,
        explanation: `The fitted line trends ${up ? 'upward' : 'downward'} (slope ≈ ${shown}).`,
        value: slope,
      };
    },
  };
}

/**
 * Algorithms whose runs expose a clean, real signal for each prediction kind.
 * Explicit id sets (rather than task alone) keep this deterministic and avoid
 * offering a prediction the trace can't actually resolve — e.g. the decision
 * tree emits no accuracy, and k-means' cluster count is fixed by `k` rather
 * than discovered.
 */
const ACCURACY_ALGOS = new Set<AlgorithmId>([
  'logreg',
  'knn',
  'naivebayes',
  'svm',
  'randomforest',
  'gbm',
  'mlp',
  'cnn',
]);
const REGRESSION_ALGOS = new Set<AlgorithmId>(['linreg', 'ridge', 'lasso', 'elasticnet']);
const CLUSTER_ALGOS = new Set<AlgorithmId>(['dbscan', 'hierarchical', 'gmm']);

/**
 * The prediction to offer for an algorithm, or null if none applies (the UI
 * then shows no Predict affordance — fully opt-out by absence). Pure and
 * deterministic.
 */
export function predictionFor(meta: AlgorithmMeta): PredictionSpec | null {
  if (ACCURACY_ALGOS.has(meta.id)) return accuracySpec();
  if (REGRESSION_ALGOS.has(meta.id)) return regressionSpec();
  if (CLUSTER_ALGOS.has(meta.id)) return clusterSpec();
  return null;
}

/**
 * Score a learner's guess against a finished run. Returns null when the run
 * produced no measurable outcome (so the caller can show "couldn't read a
 * result" rather than a false miss).
 */
export function scorePrediction(
  spec: PredictionSpec,
  chosenId: string,
  events: TraceEvent[],
): PredictionScore | null {
  const resolution = spec.resolve(events);
  if (!resolution) return null;
  return { correct: chosenId === resolution.actualChoiceId, resolution };
}
