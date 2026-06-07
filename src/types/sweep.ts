/**
 * Hyperparameter sweep types.
 *
 * A sweep runs the same algorithm + dataset N times with a chosen hyperparameter
 * stepped across a range, then plots how a chosen metric responds.
 *
 * The result is a learning curve over the hyperparam — what classical ML texts
 * call a "validation curve" — surfacing under/overfitting at a glance.
 */

export type SweepMetricKind = 'accuracy' | 'loss' | 'inertia' | 'distortion';

export interface SweepConfig {
  algorithmId: string;
  datasetId: string;
  hyperparamId: string;
  /** Values to sweep through. Pre-computed from min/max/steps in the UI. */
  values: number[];
}

export interface SweepPoint {
  value: number;
  metric: number | null;
  metricKind: SweepMetricKind | null;
  totalEvents: number;
  status: 'pending' | 'running' | 'done' | 'error';
  errorMessage?: string;
}

export interface SweepResult {
  points: SweepPoint[];
  metricKind: SweepMetricKind | null;
  betterIsHigher: boolean;
  bestIndex: number | null;
}

/**
 * Decide which final-event field counts as the metric for this run.
 * Preference: accuracy > loss > inertia > distortion.
 *
 * For classification we surface accuracy directly (higher is better).
 * For regression / clustering we fall back to loss / inertia (lower is better).
 */
export function extractMetric(
  events: Record<string, unknown>[],
): { kind: SweepMetricKind; value: number; betterIsHigher: boolean } | null {
  // Scan from the end, but ignore the trailing 'finished' / 'converged' marker
  // which usually carries no metrics.
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (typeof e.accuracy === 'number') return { kind: 'accuracy', value: e.accuracy, betterIsHigher: true };
  }
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (typeof e.loss === 'number') return { kind: 'loss', value: e.loss, betterIsHigher: false };
  }
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (typeof e.inertia === 'number') return { kind: 'inertia', value: e.inertia, betterIsHigher: false };
  }
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (typeof e.distortion === 'number') return { kind: 'distortion', value: e.distortion, betterIsHigher: false };
  }
  return null;
}
