/**
 * convergence — normalize a per-iteration metric series out of a raw trace.
 *
 * Different algorithm families emit their convergence signal under different
 * keys (`loss`, `inertia`, `metric`, `ensembleAccuracy`, …). This pure helper
 * collapses them into a single typed series so a standardized convergence chart
 * can render consistently, reusing the Tier 2 `LossChart` / `loss-chart-utils`
 * pattern. Algorithms that don't emit such a series yield `null`.
 */

import type { TraceEvent } from '@/types/trace';
import type { LossPoint } from '@/visualizations/loss-chart-utils';

export interface ConvergenceSeries {
  points: LossPoint[];
  /** Tooltip metric label, e.g. "Loss", "Inertia", "Accuracy". */
  label: string;
  /** Y-axis caption (mirrors `label`). */
  yAxisLabel: string;
}

/** Minimum points for a series to be worth charting. */
export const CONVERGENCE_MIN_POINTS = 2;

/** Extract the per-event metric value + its label, or null if none applies. */
function metricOf(ev: TraceEvent): { value: number; label: string } | null {
  switch (ev.type) {
    case 'linreg:init':
    case 'linreg:step':
    case 'polyreg:init':
    case 'polyreg:step':
    case 'logreg:init':
    case 'logreg:step':
    case 'mlp:init':
    case 'mlp:step':
    case 'cnn:init':
    case 'cnn:step':
      return { value: ev.loss, label: 'Loss' };
    case 'kmeans:assign':
    case 'kmeans:update':
      return { value: ev.inertia, label: 'Inertia' };
    case 'forest:tree_grown':
      return { value: ev.ensembleAccuracy, label: 'Accuracy' };
    case 'boundary:step':
      return typeof ev.loss === 'number' ? { value: ev.loss, label: 'Loss' } : null;
    case 'projection:step':
      return typeof ev.loss === 'number' ? { value: ev.loss, label: 'Loss' } : null;
    case 'cluster:step':
      return typeof ev.metric === 'number'
        ? { value: ev.metric, label: ev.metricLabel ?? 'Metric' }
        : null;
    case 'rl:episode':
      return { value: ev.reward, label: 'Reward' };
    default:
      return null;
  }
}

/**
 * Build a normalized convergence series from a trace. Uses each event's
 * `iteration` when present, otherwise a running index, so the x-axis is always
 * monotonic. Returns `null` when fewer than {@link CONVERGENCE_MIN_POINTS}
 * metric-bearing events exist (i.e. the algorithm doesn't converge iteratively).
 */
export function extractConvergence(events: TraceEvent[]): ConvergenceSeries | null {
  const points: LossPoint[] = [];
  let label = 'Loss';
  let index = 0;

  for (const ev of events) {
    const m = metricOf(ev);
    if (!m) continue;
    label = m.label;
    const iteration =
      typeof ev.iteration === 'number' && Number.isFinite(ev.iteration) ? ev.iteration : index;
    points.push({ iteration, loss: m.value });
    index += 1;
  }

  if (points.length < CONVERGENCE_MIN_POINTS) return null;
  return { points, label, yAxisLabel: label };
}
