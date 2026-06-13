/**
 * Pure helpers for the loss/convergence chart. Kept separate from the React
 * component so the domain/scaling math is unit-testable without a DOM.
 */

export interface LossPoint {
  iteration: number;
  loss: number;
}

export interface LossDomains {
  x: [number, number];
  y: [number, number];
}

/**
 * Compute the x (iteration) and y (loss) domains for the chart.
 *
 * The y range is padded ~8% so the curve doesn't touch the panel edges, and a
 * perfectly flat series still renders inside a visible band.
 */
export function lossChartDomains(history: LossPoint[]): LossDomains {
  if (history.length === 0) return { x: [0, 1], y: [0, 1] };

  const iters = history.map((d) => d.iteration);
  const losses = history.map((d) => d.loss).filter((v) => Number.isFinite(v));

  const xMin = Math.min(...iters);
  const xMaxRaw = Math.max(...iters);
  const xMax = xMaxRaw === xMin ? xMin + 1 : xMaxRaw;

  const loMin = losses.length ? Math.min(...losses) : 0;
  const loMax = losses.length ? Math.max(...losses) : 1;
  const span = loMax - loMin;
  const pad = span === 0 ? Math.max(Math.abs(loMax) * 0.1, 0.5) : span * 0.08;

  return { x: [xMin, xMax], y: [loMin - pad, loMax + pad] };
}

/**
 * Index of the history point whose iteration is closest to `iteration`.
 * Returns -1 for an empty series. Ties resolve to the earlier point.
 */
export function nearestLossIndex(history: LossPoint[], iteration: number): number {
  if (history.length === 0) return -1;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < history.length; i += 1) {
    const dist = Math.abs(history[i].iteration - iteration);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
